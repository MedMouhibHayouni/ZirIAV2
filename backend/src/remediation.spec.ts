/**
 * P0/P1 regression guards for the security remediation (Phases 0-8).
 * - Unit tests: gateway identity/validation logic (no DB required).
 * - Live tests: HTTP behavior vs local dev backend (requires `npm run start:dev`
 *   + Postgres running on localhost:3000). Skipped gracefully if unreachable.
 */
import { LandAuctionGateway } from './land/land-auction.gateway';
import { GpsTrackingGateway } from './drivers/gps-tracking.gateway';
import { ExpertGateway } from './ai/gateways/expert.gateway';

const BASE = process.env.REMEDIATION_BASE_URL || 'http://localhost:3000';
const rnd = () => Math.random().toString(36).slice(2, 10);

async function http(method: string, url: string, body?: any, token?: string) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, text: await res.text() };
}

async function backendReachable(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/', { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function register(email: string): Promise<{ status: number; token?: string }> {
  const attempt = async (addr: string) => {
    const r = await http('POST', '/auth/register', {
      name: 'Remediation Test',
      email: addr,
      role: 'FARMER',
      password: 'longpassword1',
    });
    let token: string | undefined;
    try {
      token = JSON.parse(r.text).access_token;
    } catch {
      token = undefined;
    }
    return { status: r.status, token };
  };
  let res = await attempt(email);
  if (res.status === 429) {
    // Auth register is throttled at 5/min — wait out the window once and retry.
    await new Promise((r) => setTimeout(r, 65000));
    res = await attempt(`retry_${email}`);
  }
  return res;
}

describe('Remediation — gateway unit guards (no DB)', () => {
  test('auction placeBid uses authenticated user, ignores spoofed bidderId', async () => {
    const calls: any[] = [];
    const emitted: any[] = [];
    const auctionService = { placeBid: jest.fn(async (...a: any[]) => (calls.push(a), { ok: true })) };
    const gw = new LandAuctionGateway(auctionService as any, {} as any, {} as any);
    (gw as any).server = { to: () => ({ emit: (ev: string, p: any) => emitted.push([ev, p]) }) };

    const res = await gw.handlePlaceBid(
      { auctionId: 'a1', amount: 100, bidderId: 'spoofed-id' } as any,
      { data: { userId: 'real-user' } } as any,
    );
    expect(res.status).toBe('success');
    expect(auctionService.placeBid).toHaveBeenCalledWith('a1', 'real-user', 100);
    expect(emitted[0][1].bidderId).toBe('real-user');
  });

  test('auction placeBid without authentication returns error', async () => {
    const auctionService = { placeBid: jest.fn() };
    const gw = new LandAuctionGateway(auctionService as any, {} as any, {} as any);
    (gw as any).server = { to: () => ({ emit: jest.fn() }) };
    const res = await gw.handlePlaceBid({ auctionId: 'a1', amount: 100 } as any, { data: {} } as any);
    expect(res.status).toBe('error');
    expect(auctionService.placeBid).not.toHaveBeenCalled();
  });

  test('GPS position_update with NaN lat/lng returns {error} without persisting', async () => {
    const driverRepo = {
      findOne: jest.fn(async () => ({ id: 'd1', tracking_session_id: 's1' })),
      update: jest.fn(),
    };
    const eventRepo = { save: jest.fn() };
    const gw = new GpsTrackingGateway({} as any, {} as any, driverRepo as any, eventRepo as any);
    (gw as any).server = { to: () => ({ emit: jest.fn() }) };
    const res = await gw.onPositionUpdate(
      { data: { driverProfileId: 'd1' } } as any,
      { session_id: 's1', lat: NaN, lng: NaN, recorded_at: new Date().toISOString() } as any,
    );
    expect(res).toEqual({ error: expect.any(String) });
    expect(eventRepo.save).not.toHaveBeenCalled();
    expect(driverRepo.update).not.toHaveBeenCalled();
  });

  test('GPS position_update with invalid date returns {error} without persisting', async () => {
    const driverRepo = {
      findOne: jest.fn(async () => ({ id: 'd1', tracking_session_id: 's1' })),
      update: jest.fn(),
    };
    const eventRepo = { save: jest.fn() };
    const gw = new GpsTrackingGateway({} as any, {} as any, driverRepo as any, eventRepo as any);
    (gw as any).server = { to: () => ({ emit: jest.fn() }) };
    const res = await gw.onPositionUpdate(
      { data: { driverProfileId: 'd1' } } as any,
      { session_id: 's1', lat: 35.17, lng: 8.83, recorded_at: 'not-a-date' } as any,
    );
    expect(res).toEqual({ error: expect.any(String) });
    expect(eventRepo.save).not.toHaveBeenCalled();
  });

  test('expert join_zone with non-string governorate returns {error}', () => {
    const gw = new ExpertGateway({} as any, {} as any);
    expect(gw.handleJoinZone({ join: jest.fn() } as any, null as any)).toEqual({
      error: expect.any(String),
    });
    expect(gw.handleJoinZone({ join: jest.fn() } as any, 123 as any)).toEqual({
      error: expect.any(String),
    });
  });

  test('expert join_conversation without other_user_id returns {error}', () => {
    const gw = new ExpertGateway({} as any, {} as any);
    const res = gw.handleJoinConversation({ data: { userId: 'u1' } } as any, {} as any);
    expect(res).toEqual({ error: expect.any(String) });
  });
});

describe('Remediation — live HTTP guards (localhost backend)', () => {
  jest.setTimeout(120000);
  let reachable = false;

  beforeAll(async () => {
    reachable = await backendReachable();
  });

  const needBackend = () => {
    if (!reachable) {
      console.warn('Local backend unreachable — skipping live remediation tests');
    }
    return reachable;
  };

  test('parallel register with same email: one 201, one 409', async () => {
    if (!needBackend()) return;
    const email = `race_${rnd()}@test.com`;
    const payload = () => ({ name: 'Race', email, role: 'FARMER', password: 'longpassword1' });
    let results = await Promise.all([http('POST', '/auth/register', payload()), http('POST', '/auth/register', payload())]);
    if (results.some((r) => r.status === 429)) {
      await new Promise((r) => setTimeout(r, 65000));
      const email2 = `race_${rnd()}@test.com`;
      const p2 = () => ({ name: 'Race', email: email2, role: 'FARMER', password: 'longpassword1' });
      results = await Promise.all([http('POST', '/auth/register', p2()), http('POST', '/auth/register', p2())]);
    }
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
  });

  test('non-owner parcel access: 403 on GET/PATCH/crop-zones; owner 200; missing 404', async () => {
    if (!needBackend()) return;
    const suffix = rnd();
    const a = await register(`owner_${suffix}@test.com`);
    const b = await register(`intruder_${suffix}@test.com`);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const created = await http('POST', '/parcels', { name: 'Secret Field', lat: 35.17, lng: 8.83 }, a.token);
    expect(created.status).toBe(201);
    const parcelId = JSON.parse(created.text).id;
    expect(parcelId).toBeDefined();

    const asIntruder = await http('GET', `/parcels/${parcelId}`, undefined, b.token);
    expect(asIntruder.status).toBe(403);

    const patchIntruder = await http(
      'PATCH',
      `/parcels/${parcelId}/boundary`,
      { boundary_geojson: { type: 'Point', coordinates: [8.8, 35.1] } },
      b.token,
    );
    expect(patchIntruder.status).toBe(403);

    const zonesIntruder = await http('GET', `/parcels/${parcelId}/crop-zones`, undefined, b.token);
    expect(zonesIntruder.status).toBe(403);

    const asOwner = await http('GET', `/parcels/${parcelId}`, undefined, a.token);
    expect(asOwner.status).toBe(200);

    const missing = await http('GET', '/parcels/00000000-0000-0000-0000-000000000000', undefined, a.token);
    expect(missing.status).toBe(404);
  });

  test('upload rejects wrong mimetype with 400', async () => {
    if (!needBackend()) return;
    const me = await register(`uploader_${rnd()}@test.com`);
    expect(me.status).toBe(201);
    const form = new FormData();
    form.append('file', new Blob(['not an image'], { type: 'text/plain' }), 'evil.txt');
    const res = await http('POST', '/upload/image', form, me.token);
    expect(res.status).toBe(400);
  });

  test('upload rejects oversized file with 413', async () => {
    if (!needBackend()) return;
    const me = await register(`bigfile_${rnd()}@test.com`);
    expect(me.status).toBe(201);
    const big = Buffer.alloc(6 * 1024 * 1024, 0);
    const form = new FormData();
    form.append('file', new Blob([big], { type: 'image/jpeg' }), 'big.jpg');
    const res = await http('POST', '/upload/image', form, me.token);
    expect(res.status).toBe(413);
  });

  test('unauthenticated upload is rejected with 401', async () => {
    if (!needBackend()) return;
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/jpeg' }), 'x.jpg');
    const res = await http('POST', '/upload/image', form);
    expect(res.status).toBe(401);
  });

  test('request burst past throttle limit surfaces 429', async () => {
    if (!needBackend()) return;
    const codes = await Promise.all(
      Array.from({ length: 115 }, () =>
        fetch(BASE + '/auth/me').then((r) => r.status).catch(() => 0),
      ),
    );
    expect(codes).toContain(429);
  });
});
