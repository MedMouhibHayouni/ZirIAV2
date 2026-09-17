import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import compression from 'compression';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ─── Sécurité : Bouclier Helmet ─────────────────────────────────────────────
  app.use(helmet()); // Bloque XSS, Clickjacking, Cache sniffing, etc.

  // ─── Payload Limit Modification ──────────────────────────────────────────────
  const express = require('express');
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // ─── CORS Strict ────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Autorise localhost, la PWA Vercel, ou les requêtes mobiles (origin null/undefined)
      const allowedOrigins = ['http://localhost:4200', 'http://localhost:3001', 'https://ziria-v2.vercel.app'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Non autorisé par CORS'));
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Observability & Performance ─────────────────────────────────────────────
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '', // Remplacer par le vrai DSN
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0, // A ajuster en production
  });

  app.use(compression()); // Réduit la taille des payloads API de ~70%

  // ─── Validation globale ──────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Supprime les propriétés non décorées
      forbidNonWhitelisted: true, // Erreur si propriété non décorée
      transform: true,          // Transforme les payloads vers les types DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Swagger API Documentation ───────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('ZirIA API')
    .setDescription(
      'API Backend du Système d\'Exploitation Rural Numérique ZirIA.\n\n' +
      'Développé par **AiKup Tech SUARL** pour la région de Kasserine, Tunisie.\n\n' +
      '**Rôles disponibles :** ADMIN, COOP_PRESIDENT, B2B_BUYER, EQUIP_OWNER, AGRI_WORKER, FARMER_AMBASSADOR'
    )
    .setVersion('1.0.0-MVP')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Entrez votre token JWT (obtenu via POST /auth/login)',
    })
    .addTag('Authentification', 'Endpoints publics de connexion et inscription')
    .addTag('Utilisateurs', 'Gestion des profils utilisateurs [ADMIN]')
    .addTag('Coopératives', 'Gestion des SMSA et coopératives agricoles')
    .addTag('Parcelles', 'Géolocalisation et gestion des parcelles agricoles')
    .addTag('Marketplace B2B', 'Catalogue de ventes groupées entre producteurs et acheteurs')
    .addTag('Équipements Agricoles', 'Location de tracteurs et machines agricoles')
    .addTag('Emplois Saisonniers', 'Offres de travail pour les journaliers agricoles')
    .addTag('Détections IA - Maladies', 'Signalement et analyse des maladies des cultures')
    .addTag('Météo', 'Prévisions météorologiques via Open-Meteo')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
    },
    customSiteTitle: 'ZirIA API - Documentation',
  });

  // ─── Démarrage ───────────────────────────────────────────────────────────────
  const configService = app.get(ConfigService);
  const jwtSecret = configService.getOrThrow('JWT_SECRET');
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not set. Refusing to boot without a signing secret.');
  }
  const port = process.env.APP_PORT || 3000;
  await app.listen(port);

  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   ZirIA Backend API - Démarré avec succès    ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  API:     http://localhost:${port}              ║`);
  console.log(`║  Swagger: http://localhost:${port}/api           ║`);
  console.log(`║  Env:     ${process.env.NODE_ENV || 'development'}                   ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
}

bootstrap();
