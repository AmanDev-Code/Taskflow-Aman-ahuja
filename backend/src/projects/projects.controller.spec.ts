import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;
  let authToken: string;
  let userId: string;
  let createdProjectId: string;

  const testUser = {
    name: 'Project Test User',
    email: `project-test-${Date.now()}@example.com`,
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    dbService = moduleFixture.get<DatabaseService>(DatabaseService);

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser);

    authToken = registerResponse.body.data.access_token;
    userId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    if (dbService && userId) {
      await dbService.query('DELETE FROM tasks WHERE creator_id = $1', [
        userId,
      ]);
      await dbService.query('DELETE FROM projects WHERE owner_id = $1', [
        userId,
      ]);
      await dbService.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await app.close();
  });

  describe('GET /projects', () => {
    it('should return 401 without authentication token', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .expect(401);

      expect(response.body.message).toContain('Authentication required');
    });

    it('should return empty array for user with no projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.message).toBe('success');
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project description',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBe(projectData.description);
      expect(response.body.data.owner_id).toBe(userId);

      createdProjectId = response.body.data.id;
    });

    it('should create project without description', async () => {
      const projectData = {
        name: 'Minimal Project',
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.data.name).toBe(projectData.name);
      expect(response.body.data.description).toBeNull();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .send({ name: 'Unauthorized Project' })
        .expect(401);
    });

    it('should return 400 for missing name', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing name' })
        .expect(400);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return project with tasks', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', createdProjectId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data.tasks).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/projects/${fakeUuid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/projects/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update project name', async () => {
      const updateData = { name: 'Updated Project Name' };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.name).toBe(updateData.name);
    });

    it('should update project description', async () => {
      const updateData = { description: 'Updated description' };

      const response = await request(app.getHttpServer())
        .patch(`/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.description).toBe(updateData.description);
    });
  });

  describe('DELETE /projects/:id', () => {
    let projectToDelete: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Project to Delete' });

      projectToDelete = response.body.data.id;
    });

    it('should delete project', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/projects/${projectToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for deleting non-existent project', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/projects/${fakeUuid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /projects - with projects', () => {
    it('should return user projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('owner_id', userId);
    });
  });
});
