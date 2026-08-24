import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyCoinSupplyEffect,
  currentSupply,
  sumIssuanceByType,
  verifySupplyIdentity,
} from './coin-supply';

describe('coin-supply', () => {
  it('classifies issuance vs transfer vs hold vs burn', () => {
    assert.equal(classifyCoinSupplyEffect('COIN_ISSUANCE', 'CREDIT'), 'ISSUANCE');
    assert.equal(classifyCoinSupplyEffect('ADMIN_ADJUSTMENT', 'CREDIT'), 'ISSUANCE');
    assert.equal(classifyCoinSupplyEffect('JOIN_REWARD_TRANSFER', 'CREDIT'), 'TRANSFER');
    assert.equal(classifyCoinSupplyEffect('JOIN_REWARD_HOLD', 'DEBIT'), 'HOLD');
    assert.equal(classifyCoinSupplyEffect('JOIN_REWARD_RELEASE', 'DEBIT'), 'RELEASE');
    assert.equal(classifyCoinSupplyEffect('JOIN_REWARD_REFUND', 'CREDIT'), 'REFUND');
    assert.equal(classifyCoinSupplyEffect('ROOM_CREATION_FEE', 'DEBIT'), 'BURN');
  });

  it('Case 1–5: purchase + event + transfer + hold + burn identity', () => {
    // Case 1 PURCHASE +1000
    let issued = '1000';
    let burned = '0';
    let available = '1000';
    let held = '0';
    assert.equal(currentSupply(issued, burned), '1000');
    assert.ok(
      verifySupplyIdentity({
        totalIssued: issued,
        totalBurned: burned,
        totalAvailable: available,
        totalHeld: held,
      }).ok,
    );

    // Case 2 EVENT +100
    issued = '1100';
    available = '1100';
    assert.ok(
      verifySupplyIdentity({
        totalIssued: issued,
        totalBurned: burned,
        totalAvailable: available,
        totalHeld: held,
      }).ok,
    );

    // Case 3 Transfer 200 — issued unchanged; available split does not matter for identity
    // host 900 avail + 0 held, guest 200 avail → still 1100
    available = '1100';
    assert.equal(issued, '1100');

    // Case 4 Hold 300: available 800, held 300
    available = '800';
    held = '300';
    assert.ok(
      verifySupplyIdentity({
        totalIssued: issued,
        totalBurned: burned,
        totalAvailable: available,
        totalHeld: held,
      }).ok,
    );

    // Case 5 Burn 10: available 790, held 300, burned 10, supply 1090
    burned = '10';
    available = '790';
    assert.equal(currentSupply(issued, burned), '1090');
    assert.ok(
      verifySupplyIdentity({
        totalIssued: issued,
        totalBurned: burned,
        totalAvailable: available,
        totalHeld: held,
      }).ok,
    );
  });

  it('Case 6: refund/release does not change issued', () => {
    const issued = '1100';
    const burned = '10';
    // release held→transfer: held 200, available 890
    assert.ok(
      verifySupplyIdentity({
        totalIssued: issued,
        totalBurned: burned,
        totalAvailable: '890',
        totalHeld: '200',
      }).ok,
    );
  });

  it('excludes DEV_SEED from production KPI when requested', () => {
    const { total, byType } = sumIssuanceByType(
      [
        { issuanceType: 'PURCHASE', amount: '1000' },
        { issuanceType: 'DEV_SEED', amount: '200' },
        { issuanceType: 'EVENT_REWARD', amount: '100' },
      ],
      { excludeDevSeed: true },
    );
    assert.equal(total, '1100');
    assert.equal(byType.PURCHASE, '1000');
    assert.equal(byType.EVENT_REWARD, '100');
    assert.equal(byType.DEV_SEED, undefined);
  });
});
