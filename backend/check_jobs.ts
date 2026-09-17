import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function checkJobs() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const dataSource = app.get(DataSource);
  
  const user = await dataSource.query(`SELECT id FROM users WHERE name = 'Ahmed Ben Salah'`);
  if (!user.length) {
    console.log('User Ahmed Ben Salah not found!');
    await app.close();
    return;
  }
  const userId = user[0].id;
  
  const jobs = await dataSource.query(`SELECT id, task_type, employer_id, status FROM job_offers WHERE employer_id = $1`, [userId]);
  console.log(`Jobs for Ahmed (${userId}):`, jobs.length);
  console.log(JSON.stringify(jobs, null, 2));
  
  await app.close();
}

checkJobs();
