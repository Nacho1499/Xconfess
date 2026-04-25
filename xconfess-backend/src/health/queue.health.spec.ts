import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueHealthIndicator } from './queue.health';

const QUEUE_NAMES = [
  'notifications',
  'notifications-dlq',
  'export-queue',
  'confession-draft-publisher',
] as const;

type QueueName = (typeof QUEUE_NAMES)[number];

function makeMockQueue(
  workers = 1,
  counts = { active: 0, waiting: 0, failed: 0, delayed: 0 },
) {
  return {
    getWorkers: jest
      .fn()
      .mockResolvedValue(new Array(workers).fill({ id: 'w1' })),
    getJobCounts: jest.fn().mockResolvedValue(counts),
  };
}

type MockQueue = ReturnType<typeof makeMockQueue>;

function buildModule(
  queueOverrides: Partial<Record<QueueName, MockQueue>>,
  jobsEnabled = true,
) {
  const queues = Object.fromEntries(
    QUEUE_NAMES.map((name) => [name, queueOverrides[name] ?? makeMockQueue()]),
  );

  return Test.createTestingModule({
    providers: [
      QueueHealthIndicator,
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) =>
            key === 'ENABLE_BACKGROUND_JOBS'
              ? jobsEnabled
                ? 'true'
                : 'false'
              : undefined,
          ),
        },
      },
      ...QUEUE_NAMES.map((name) => ({
        provide: getQueueToken(name),
        useValue: queues[name],
      })),
    ],
  }).compile();
}

describe('QueueHealthIndicator', () => {
  let indicator: QueueHealthIndicator;

  describe('when background jobs are disabled', () => {
    beforeEach(async () => {
      const module: TestingModule = await buildModule({}, false);
      indicator = module.get(QueueHealthIndicator);
    });

    it('returns up with mode=disabled and skips queue checks', async () => {
      const result = await indicator.isHealthy('queues');
      expect(result.queues.status).toBe('up');
      expect(result.queues).toMatchObject({ mode: 'disabled' });
    });
  });

  describe('when background jobs are enabled', () => {
    describe('and all queues have workers', () => {
      beforeEach(async () => {
        const module: TestingModule = await buildModule({});
        indicator = module.get(QueueHealthIndicator);
      });

      it('returns up with per-queue worker and count details', async () => {
        const result = await indicator.isHealthy('queues');
        expect(result.queues.status).toBe('up');
        expect(result.queues['notifications']).toMatchObject({
          status: 'up',
          workers: 1,
        });
      });
    });

    describe('and a worker-required queue has no workers', () => {
      beforeEach(async () => {
        const module: TestingModule = await buildModule({
          notifications: makeMockQueue(0),
        });
        indicator = module.get(QueueHealthIndicator);
      });

      it('throws HealthCheckError', async () => {
        await expect(indicator.isHealthy('queues')).rejects.toThrow(
          HealthCheckError,
        );
      });

      it('marks the affected queue as down in the error detail', async () => {
        expect.assertions(2);
        try {
          await indicator.isHealthy('queues');
        } catch (err) {
          expect(err).toBeInstanceOf(HealthCheckError);
          const causes = (err as HealthCheckError).causes as Record<
            string,
            Record<string, unknown>
          >;
          expect(causes['queues']['notifications']).toMatchObject({
            status: 'down',
            workers: 0,
          });
        }
      });
    });

    describe('and the DLQ has no workers', () => {
      beforeEach(async () => {
        const module: TestingModule = await buildModule({
          'notifications-dlq': makeMockQueue(0),
        });
        indicator = module.get(QueueHealthIndicator);
      });

      it('remains healthy — DLQ does not require workers', async () => {
        const result = await indicator.isHealthy('queues');
        expect(result.queues.status).toBe('up');
        expect(result.queues['notifications-dlq']).toMatchObject({
          status: 'up',
          workers: 0,
        });
      });
    });

    describe('and a queue throws during the check', () => {
      beforeEach(async () => {
        const broken: MockQueue = {
          getWorkers: jest
            .fn()
            .mockRejectedValue(new Error('ECONNREFUSED')),
          getJobCounts: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await buildModule({
          'export-queue': broken,
        });
        indicator = module.get(QueueHealthIndicator);
      });

      it('throws HealthCheckError with error detail for the failing queue', async () => {
        await expect(indicator.isHealthy('queues')).rejects.toThrow(
          HealthCheckError,
        );
      });
    });

    describe('job counts are forwarded in the result', () => {
      beforeEach(async () => {
        const queueWithJobs = makeMockQueue(2, {
          active: 3,
          waiting: 10,
          failed: 1,
          delayed: 0,
        });
        const module: TestingModule = await buildModule({
          notifications: queueWithJobs,
        });
        indicator = module.get(QueueHealthIndicator);
      });

      it('includes counts in the healthy result', async () => {
        const result = await indicator.isHealthy('queues');
        expect(result.queues['notifications']).toMatchObject({
          counts: { active: 3, waiting: 10, failed: 1, delayed: 0 },
        });
      });
    });
  });
});
