import http from 'k6/http';
import { check, sleep } from 'k6';

// Scénario : 1000 utilisateurs simultanés avec un ramp-up de 30 secondes
export const options = {
  stages: [
    { duration: '30s', target: 1000 }, // Ramp-up à 1000 VUs
    { duration: '1m', target: 1000 },  // Maintien de la charge pendant 1 minute
    { duration: '10s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    // Les requêtes HTTP doivent répondre en moins de 500ms dans 95% des cas
    http_req_duration: ['p(95)<500'],
    // Le taux d'erreur HTTP doit être inférieur à 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

// Note : Fournir un email et password d'un Farmer existant
const USER_CREDENTIALS = {
  email: 'farmer@test.com',
  password: 'password123',
};

export default function () {
  // 1. Authentification (POST /auth/login)
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(USER_CREDENTIALS), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has access_token': (r) => r.json('access_token') !== undefined,
  });

  // Si le login échoue, on arrête le flux pour ce VU
  if (loginRes.status !== 200) {
    sleep(1);
    return;
  }

  const token = loginRes.json('access_token');
  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  sleep(1); // Simuler le temps de réflexion de l'utilisateur

  // 2. Récupération des parcelles (GET /parcels/my)
  const parcelsRes = http.get(`${BASE_URL}/parcels/my`, authHeaders);
  
  check(parcelsRes, {
    'parcels status is 200': (r) => r.status === 200,
    'parcels return array': (r) => Array.isArray(r.json()),
  });

  sleep(2); // L'utilisateur regarde ses parcelles

  // 3. Demande à l'Agent IA (POST /agent/message)
  const payload = JSON.stringify({ message: "Quels sont les rendements attendus pour l'olive cette année ?" });
  const agentRes = http.post(`${BASE_URL}/agent/message`, payload, authHeaders);

  check(agentRes, {
    'agent status is 201 or 200': (r) => r.status === 200 || r.status === 201,
    'agent reply exists': (r) => r.json('reply') !== undefined,
  });

  sleep(1);
}
