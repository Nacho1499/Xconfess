/**
 * Issue #428: Test export redaction for deleted/deactivated users
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DataExportService } from './data-export.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportRequest } from './entities/export-request.entity';
import { ExportChunk } from './entities/export-chunk.entity';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('DataExportService - Redaction Policy', () => {
  let service: DataExportService;
  let exportRepository: any;

  const mockUser = {
    id: 1,
    username: 'testuser',
    is_active: true,
  };

  const mockDeactivatedUser = {
    id: 2,
    username: 'deactivateduser',
    is_active: false,
  };

  const mockConfession = {
    id: 'confession-1',
    message: 'This is a test confession',
    isDeleted: false,
    deletedAt: null,
    isHidden: false,
    moderationStatus: 'approved',
    created_at: new Date(),
    isAnchored: false,
  };

  const mockDeletedConfession = {
    id: 'confession-2',
    message: 'This was deleted',
    isDeleted: true,
    deletedAt: new Date(),
    isHidden: false,
    moderationStatus: 'approved',
    created_at: new Date(),
  };

  const mockModeratedConfession = {
    id: 'confession-3',
    message: 'This was moderated',
    isDeleted: false,
    deletedAt: null,
    isHidden: true,
    moderationStatus: 'rejected',
    moderationScore: 0.95,
    moderationFlags: ['hate_speech'],
    created_at: new Date(),
  };

  const mockComment = {
    id: 1,
    content: 'Test comment',
    isDeleted: false,
    createdAt: new Date(),
    confession: { id: 'confession-1' },
  };

  const mockDeletedComment = {
    id: 2,
    content: 'Deleted comment',
    isDeleted: true,
    createdAt: new Date(),
    confession: { id: 'confession-1' },
  };

  beforeEach(async () => {
    const mockManager = {
      getRepository: jest.fn((entity: string) => {
        if (entity === 'User') {
          return {
            findOne: jest.fn(),
          };
        }
        if (entity === 'AnonymousConfession') {
          return {
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          };
        }
        if (entity === 'Comment') {
          return {
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          };
        }
        if (entity === 'Message') {
          return {
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          };
        }
        return {};
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        {
          provide: getRepositoryToken(ExportRequest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
            manager: mockManager,
          },
        },
        {
          provide: getRepositoryToken(ExportChunk),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getQueueToken('data-export'),
          useValue: {
            add: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => defaultValue),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logExportLifecycleEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
    exportRepository = module.get(getRepositoryToken(ExportRequest));
  });

  describe('Confession Redaction', () => {
    it('should redact deleted confessions', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([mockDeletedConfession]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result.confessions[0]._redacted).toBe(true);
      expect(result.confessions[0]._reason).toBe('deleted');
      expect(result.confessions[0].message).toContain('[REDACTED');
    });

    it('should redact moderated confessions', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([mockModeratedConfession]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result.confessions[0]._redacted).toBe(true);
      expect(result.confessions[0]._reason).toBe('moderated');
      expect(result.confessions[0].message).toContain('[REDACTED');
      expect(result.confessions[0].metadata.moderationScore).toBe(0.95);
    });

    it('should not redact active user confessions', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([mockConfession]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result.confessions[0]._redacted).toBe(false);
      expect(result.confessions[0].message).toBe(mockConfession.message);
    });

    it('should redact all content for deactivated users', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockDeactivatedUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockDeactivatedUser.id }), 'getMany')
        .mockResolvedValue([mockConfession]);

      const result = await service.compileUserData(mockDeactivatedUser.id.toString());

      expect(result.userStatus).toBe('deactivated');
      expect(result.confessions[0]._redacted).toBe(true);
      expect(result.confessions[0]._reason).toBe('user_deactivated');
    });
  });

  describe('Comment Redaction', () => {
    it('should redact deleted comments', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');
      const commentRepo = exportRepository.manager.getRepository('Comment');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([]);
      jest.spyOn(commentRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([mockDeletedComment]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result.comments[0]._redacted).toBe(true);
      expect(result.comments[0]._reason).toBe('deleted');
      expect(result.comments[0].content).toContain('[REDACTED');
    });

    it('should not redact active comments', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');
      const commentRepo = exportRepository.manager.getRepository('Comment');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([]);
      jest.spyOn(commentRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([mockComment]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result.comments[0]._redacted).toBe(false);
      expect(result.comments[0].content).toBe(mockComment.content);
    });
  });

  describe('Export Metadata', () => {
    it('should include redaction policy in export', async () => {
      const userRepo = exportRepository.manager.getRepository('User');
      const confessionRepo = exportRepository.manager.getRepository('AnonymousConfession');
      const commentRepo = exportRepository.manager.getRepository('Comment');
      const messageRepo = exportRepository.manager.getRepository('Message');

      jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(confessionRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([]);
      jest.spyOn(commentRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([]);
      jest.spyOn(messageRepo.createQueryBuilder().where('userLinks.userId = :userId', { userId: mockUser.id }), 'getMany')
        .mockResolvedValue([]);

      const result = await service.compileUserData(mockUser.id.toString());

      expect(result._redactionPolicy).toBeDefined();
      expect(result._redactionPolicy.deletedContentMasked).toBe(true);
      expect(result._redactionPolicy.moderatedContentMasked).toBe(true);
    });
  });
});
