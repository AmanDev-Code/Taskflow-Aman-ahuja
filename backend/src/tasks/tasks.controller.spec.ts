import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { DatabaseService } from '../database/database.service';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let dbService: DatabaseService;
  let authToken: string;
  let userId: string;
  let projectId: string;
  let createdTaskId: string;

  const testUser = {
    name: 'Task Test User',
    email: `task-test-${Date.now()}@example.com`,
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

    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Task Test Project' });

    projectId = projectResponse.body.data.id;
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

  describe('GET /projects/:projectId/tasks', () => {
    it('should return empty tasks array for new project', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .expect(401);
    });

    it('should return 403 for non-owner project access', async () => {
      const otherUser = {
        name: 'Other User',
        email: `other-${Date.now()}@example.com`,
        password: 'password123',
      };

      const otherRegister = await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUser);

      const otherToken = otherRegister.body.data.access_token;
      const otherUserId = otherRegister.body.data.user.id;

      await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      await dbService.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  describe('POST /projects/:projectId/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        status: 'todo',
        priority: 'high',
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.description).toBe(taskData.description);
      expect(response.body.data.status).toBe(taskData.status);
      expect(response.body.data.priority).toBe(taskData.priority);
      expect(response.body.data.project_id).toBe(projectId);
      expect(response.body.data.creator_id).toBe(userId);

      createdTaskId = response.body.data.id;
    });

    it('should create task with minimal data', async () => {
      const taskData = {
        title: 'Minimal Task',
      };

      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body.data.title).toBe(taskData.title);
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.priority).toBe('medium');
    });

    it('should return 400 for missing title', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing title' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .send({ title: 'Unauthorized Task' })
        .expect(401);
    });
  });

  describe('GET /projects/:projectId/tasks - with filters', () => {
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'In Progress Task', status: 'in_progress' });

      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Low Priority Task', priority: 'low' });
    });

    it('should return all tasks without filters', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks?status=in_progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      response.body.data.forEach((task: any) => {
        expect(task.status).toBe('in_progress');
      });
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks?priority=low`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      response.body.data.forEach((task: any) => {
        expect(task.priority).toBe('low');
      });
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.data.status).toBe('in_progress');
    });

    it('should update task priority', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 'low' })
        .expect(200);

      expect(response.body.data.priority).toBe('low');
    });

    it('should update task title and description', async () => {
      const updateData = {
        title: 'Updated Task Title',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/tasks/${fakeUuid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(404);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}`)
        .send({ status: 'done' })
        .expect(401);
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskToDelete: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Task to Delete' });

      taskToDelete = response.body.data.id;
    });

    it('should delete task', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      await request(app.getHttpServer())
        .patch(`/tasks/${taskToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/tasks/${fakeUuid}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${createdTaskId}`)
        .expect(401);
    });
  });

  describe('Authorization - non-owner access', () => {
    let otherUserToken: string;
    let otherUserId: string;

    beforeAll(async () => {
      const otherUser = {
        name: 'Another User',
        email: `another-${Date.now()}@example.com`,
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUser);

      otherUserToken = response.body.data.access_token;
      otherUserId = response.body.data.user.id;
    });

    afterAll(async () => {
      if (otherUserId) {
        await dbService.query('DELETE FROM users WHERE id = $1', [otherUserId]);
      }
    });

    it('should return 403 when non-owner tries to update task', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ status: 'done' })
        .expect(403);
    });

    it('should return 403 when non-owner tries to delete task', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });

    it('should return 403 when non-owner tries to create task in project', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Unauthorized Task' })
        .expect(403);
    });
  });

  describe('Time tracking', () => {
    let timerTaskId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Timer Task' })
        .expect(201);

      timerTaskId = response.body.data.id;
    });

    it('should start timer and return running status', async () => {
      const startRes = await request(app.getHttpServer())
        .post(`/tasks/${timerTaskId}/time/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(startRes.body.data).toHaveProperty('startedAt');

      const statusRes = await request(app.getHttpServer())
        .get(`/tasks/${timerTaskId}/time/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusRes.body.data.isRunning).toBe(true);
      expect(statusRes.body.data.startedAt).toBeTruthy();
      expect(statusRes.body.data).toHaveProperty('totalTimeSpent');
    });

    it('should stop timer and persist at least 1 minute for a started timer', async () => {
      const stopRes = await request(app.getHttpServer())
        .post(`/tasks/${timerTaskId}/time/stop`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(stopRes.body.data.elapsedMinutes).toBeGreaterThanOrEqual(1);
      expect(stopRes.body.data.totalTimeSpent).toBeGreaterThanOrEqual(1);

      const taskRes = await request(app.getHttpServer())
        .get(`/tasks/${timerTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(taskRes.body.data.time_spent).toBeGreaterThanOrEqual(1);
    });
  });
});
