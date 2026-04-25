import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TippingService } from './tipping.service';
import { Tip } from './entities/tip.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { StellarService } from '../stellar/stellar.service';
import { TipFactory } from '../test/utils/factories/tip-factory';
import { VerifyTipDto } from './dto/verify-tip.dto';

/**
 * Test suite for tipping functionality using seed helpers
 * 
 * These tests demonstrate the usage of TipFactory for creating
 * reproducible tip scenarios without manual setup.
 */
describe('Tipping Service Tests with Seed Helpers', () => {
  let service: TippingService;
  let tipRepository: Repository<Tip>;
  let confessionRepository: Repository<AnonymousConfession>;
  let stellarService: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Tip, AnonymousConfession],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Tip, AnonymousConfession]),
      ],
      providers: [
        TippingService,
        {
          provide: getRepositoryToken(Tip),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AnonymousConfession),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: StellarService,
          useValue: {
            verifyTransaction: jest.fn(),
            getHorizonTxUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TippingService>(TippingService);
    tipRepository = module.get<Repository<Tip>>(getRepositoryToken(Tip));
    confessionRepository = module.get<Repository<AnonymousConfession>>(getRepositoryToken(AnonymousConfession));
    stellarService = module.get<StellarService>(StellarService);
  });

  describe('Tip Factory Helpers', () => {
    it('should create a pending tip using factory', () => {
      const pendingTip = TipFactory.buildPendingTip();
      
      expect(pendingTip).toBeDefined();
      expect(pendingTip.id).toBeTruthy();
      expect(pendingTip.confessionId).toBeTruthy();
      expect(pendingTip.amount).toBeGreaterThanOrEqual(0.1);
      expect(pendingTip.txId).toMatch(/^[a-f0-9]{64}$/i);
      expect(pendingTip.createdAt).toBeInstanceOf(Date);
    });

    it('should create an anonymous tip using factory', () => {
      const anonymousTip = TipFactory.buildAnonymousTip();
      
      expect(anonymousTip).toBeDefined();
      expect(anonymousTip.senderAddress).toBeNull();
      expect(anonymousTip.amount).toBeGreaterThanOrEqual(0.1);
      expect(anonymousTip.txId).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should create a verified tip using factory', () => {
      const verifiedTip = TipFactory.buildVerifiedTip();
      
      expect(verifiedTip).toBeDefined();
      expect(verifiedTip.amount).toBeGreaterThanOrEqual(0.1);
      expect(verifiedTip.txId).toMatch(/^[a-f0-9]{64}$/i);
      expect(verifiedTip.createdAt).toBeInstanceOf(Date);
    });

    it('should create mixed tips for comprehensive testing', () => {
      const confessionId = 'test-confession-id';
      const mixedTips = TipFactory.buildMixedTipsForConfession(confessionId, 5);
      
      expect(mixedTips).toHaveLength(5);
      mixedTips.forEach(tip => {
        expect(tip.confessionId).toBe(confessionId);
        expect(tip.amount).toBeGreaterThanOrEqual(0.1);
        expect(tip.txId).toBeTruthy();
      });
      
      const anonymousCount = mixedTips.filter(t => t.senderAddress === null).length;
      expect(anonymousCount).toBeGreaterThan(0);
    });

    it('should create deterministic test data for reproducible tests', () => {
      const deterministic1 = TipFactory.buildDeterministic();
      const deterministic2 = TipFactory.buildDeterministic();
      
      expect(deterministic1.id).toBe(deterministic2.id);
      expect(deterministic1.confessionId).toBe(deterministic2.confessionId);
      expect(deterministic1.amount).toBe(deterministic2.amount);
      expect(deterministic1.txId).toBe(deterministic2.txId);
    });

    it('should create confession with associated tips', () => {
      const { confession, tips } = TipFactory.buildConfessionWithTips(3);
      
      expect(confession).toBeDefined();
      expect(tips).toHaveLength(3);
      
      tips.forEach(tip => {
        expect(tip.confessionId).toBe(confession.id);
        expect(tip.amount).toBeGreaterThanOrEqual(0.1);
      });
    });
  });

  describe('Tipping Service Integration with Seed Helpers', () => {
    it('should get tips by confession ID using factory data', async () => {
      const confessionId = 'test-confession-id';
      const mockTips = TipFactory.buildMixedTipsForConfession(confessionId, 3);
      
      (tipRepository.find as jest.Mock).mockResolvedValue(mockTips);
      
      const result = await service.getTipsByConfessionId(confessionId);
      
      expect(result).toHaveLength(3);
      expect(result[0].confessionId).toBe(confessionId);
      expect(tipRepository.find).toHaveBeenCalledWith({
        where: { confessionId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should calculate tip statistics using factory data', async () => {
      const confessionId = 'test-confession-id';
      const mockTips = TipFactory.buildMixedTipsForConfession(confessionId, 4);
      
      (tipRepository.find as jest.Mock).mockResolvedValue(mockTips);
      
      const stats = await service.getTipStats(confessionId);
      
      expect(stats).toHaveProperty('totalAmount');
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('averageAmount');
      expect(stats.totalCount).toBe(4);
      expect(stats.totalAmount).toBeGreaterThan(0);
      expect(stats.averageAmount).toBe(stats.totalAmount / 4);
    });

    it('should handle pending verification batch', async () => {
      const confessionId = 'test-confession-id';
      const pendingTips = TipFactory.buildPendingVerificationBatch(confessionId, 3);
      
      expect(pendingTips).toHaveLength(3);
      expect(pendingTips[0].amount).toBe(0.5);
      expect(pendingTips[1].amount).toBe(0.75);
      expect(pendingTips[2].amount).toBe(1.0);
      
      // Verify timestamps are 1 minute apart
      const timeDiff1 = pendingTips[1].createdAt.getTime() - pendingTips[0].createdAt.getTime();
      const timeDiff2 = pendingTips[2].createdAt.getTime() - pendingTips[1].createdAt.getTime();
      expect(timeDiff1).toBe(60000); // 1 minute
      expect(timeDiff2).toBe(60000); // 1 minute
    });
  });

  describe('Tip Verification Workflow with Helpers', () => {
    it('should verify and record tip using factory data', async () => {
      const confessionId = 'test-confession-id';
      const pendingTip = TipFactory.buildPendingTip(confessionId);
      const mockConfession = { id: confessionId, message: 'test confession' };
      
      (confessionRepository.findOne as jest.Mock).mockResolvedValue(mockConfession);
      (tipRepository.findOne as jest.Mock).mockResolvedValue(null); // No existing tip
      (stellarService.verifyTransaction as jest.Mock).mockResolvedValue(true);
      (stellarService.getHorizonTxUrl as jest.Mock).mockReturnValue('mock-horizon-url');
      
      // Mock fetch response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          _embedded: {
            operations: [{
              type: 'payment',
              asset_type: 'native',
              amount: pendingTip.amount.toString(),
              from: pendingTip.senderAddress,
            }],
          },
        }),
      });
      
      const createdTip = { ...pendingTip, id: 'new-tip-id' };
      (tipRepository.create as jest.Mock).mockReturnValue(createdTip);
      (tipRepository.save as jest.Mock).mockResolvedValue(createdTip);
      
      const dto: VerifyTipDto = { txId: pendingTip.txId };
      const result = await service.verifyAndRecordTip(confessionId, dto);
      
      expect(result).toBeDefined();
      expect(result.confessionId).toBe(confessionId);
      expect(result.amount).toBe(pendingTip.amount);
      expect(result.txId).toBe(pendingTip.txId);
      expect(confessionRepository.findOne).toHaveBeenCalledWith({ where: { id: confessionId } });
      expect(stellarService.verifyTransaction).toHaveBeenCalledWith(pendingTip.txId);
    });

    it('should handle anonymous tip verification', async () => {
      const confessionId = 'test-confession-id';
      const anonymousTip = TipFactory.buildAnonymousTip(confessionId);
      const mockConfession = { id: confessionId, message: 'test confession' };
      
      (confessionRepository.findOne as jest.Mock).mockResolvedValue(mockConfession);
      (tipRepository.findOne as jest.Mock).mockResolvedValue(null);
      (stellarService.verifyTransaction as jest.Mock).mockResolvedValue(true);
      (stellarService.getHorizonTxUrl as jest.Mock).mockReturnValue('mock-horizon-url');
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          _embedded: {
            operations: [{
              type: 'payment',
              asset_type: 'native',
              amount: anonymousTip.amount.toString(),
              from: null, // Anonymous sender
            }],
          },
        }),
      });
      
      const createdTip = { ...anonymousTip, id: 'new-anonymous-tip-id' };
      (tipRepository.create as jest.Mock).mockReturnValue(createdTip);
      (tipRepository.save as jest.Mock).mockResolvedValue(createdTip);
      
      const dto: VerifyTipDto = { txId: anonymousTip.txId };
      const result = await service.verifyAndRecordTip(confessionId, dto);
      
      expect(result).toBeDefined();
      expect(result.senderAddress).toBeNull();
      expect(result.amount).toBe(anonymousTip.amount);
    });

    it('should reject duplicate tip transactions', async () => {
      const confessionId = 'test-confession-id';
      const existingTip = TipFactory.buildVerifiedTip(confessionId);
      const mockConfession = { id: confessionId, message: 'test confession' };
      
      (confessionRepository.findOne as jest.Mock).mockResolvedValue(mockConfession);
      (tipRepository.findOne as jest.Mock).mockResolvedValue(existingTip); // Existing tip found
      
      const dto: VerifyTipDto = { txId: existingTip.txId };
      
      await expect(service.verifyAndRecordTip(confessionId, dto))
        .rejects.toThrow('Tip transaction already recorded');
    });

    it('should handle invalid transaction verification', async () => {
      const confessionId = 'test-confession-id';
      const invalidTip = TipFactory.buildInvalidTip(confessionId);
      const mockConfession = { id: confessionId, message: 'test confession' };
      
      (confessionRepository.findOne as jest.Mock).mockResolvedValue(mockConfession);
      (tipRepository.findOne as jest.Mock).mockResolvedValue(null);
      (stellarService.verifyTransaction as jest.Mock).mockResolvedValue(false); // Invalid transaction
      
      const dto: VerifyTipDto = { txId: invalidTip.txId };
      
      await expect(service.verifyAndRecordTip(confessionId, dto))
        .rejects.toThrow('Transaction not found or invalid on Stellar network');
    });
  });

  describe('Edge Cases with Factory Helpers', () => {
    it('should handle minimum amount tips', () => {
      const minTip = TipFactory.buildMinimumTip();
      
      expect(minTip.amount).toBe(0.1);
      expect(minTip.txId).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should handle large amount tips', () => {
      const largeTip = TipFactory.buildLargeTip();
      
      expect(largeTip.amount).toBeGreaterThanOrEqual(50.0);
      expect(largeTip.amount).toBeLessThanOrEqual(1000.0);
    });

    it('should handle tips with invalid transaction format', () => {
      const invalidTip = TipFactory.buildInvalidTip();
      
      expect(invalidTip.txId).not.toMatch(/^[a-f0-9]{64}$/i);
      expect(invalidTip.txId.length).toBeLessThan(64);
    });

    it('should maintain data consistency across factory calls', () => {
      const tip1 = TipFactory.buildPendingTip();
      const tip2 = TipFactory.buildPendingTip();
      const tip3 = TipFactory.buildPendingTip();
      
      // All should have valid structure but different data
      expect(tip1.id).not.toBe(tip2.id);
      expect(tip2.id).not.toBe(tip3.id);
      expect(tip1.txId).not.toBe(tip2.txId);
      expect(tip2.txId).not.toBe(tip3.txId);
      
      // All should have valid format
      expect(tip1.txId).toMatch(/^[a-f0-9]{64}$/i);
      expect(tip2.txId).toMatch(/^[a-f0-9]{64}$/i);
      expect(tip3.txId).toMatch(/^[a-f0-9]{64}$/i);
    });
  });

  describe('Performance Testing with Factory Helpers', () => {
    it('should handle large batches of tips efficiently', () => {
      const startTime = Date.now();
      const largeBatch = TipFactory.buildMixedTipsForConfession('test-confession', 100);
      const endTime = Date.now();
      
      expect(largeBatch).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      const totalAmount = largeBatch.reduce((sum, tip) => sum + tip.amount, 0);
      expect(totalAmount).toBeGreaterThan(0);
    });

    it('should maintain performance with deterministic data', () => {
      const startTime = Date.now();
      const deterministicBatch = Array.from({ length: 50 }, () => TipFactory.buildDeterministic());
      const endTime = Date.now();
      
      expect(deterministicBatch).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(500); // Should be very fast
      
      // All should be identical
      const first = deterministicBatch[0];
      deterministicBatch.forEach(tip => {
        expect(tip.id).toBe(first.id);
        expect(tip.amount).toBe(first.amount);
        expect(tip.txId).toBe(first.txId);
      });
    });
  });
});
