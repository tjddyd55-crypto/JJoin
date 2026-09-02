import assert from 'node:assert/strict';
import test from 'node:test';
import { popStackOrParent } from './stack-navigation';

test('popStackOrParent prefers current navigator goBack', () => {
  let current = 0;
  let parent = 0;
  let routerCalls = 0;
  popStackOrParent(
    {
      canGoBack: () => true,
      goBack: () => {
        current += 1;
      },
      getParent: () => ({
        canGoBack: () => true,
        goBack: () => {
          parent += 1;
        },
      }),
    },
    () => {
      routerCalls += 1;
    },
  );
  assert.equal(current, 1);
  assert.equal(parent, 0);
  assert.equal(routerCalls, 0);
});

test('popStackOrParent falls back to parent when leaf cannot go back', () => {
  let current = 0;
  let parent = 0;
  let routerCalls = 0;
  popStackOrParent(
    {
      canGoBack: () => false,
      goBack: () => {
        current += 1;
      },
      getParent: () => ({
        canGoBack: () => true,
        goBack: () => {
          parent += 1;
        },
      }),
    },
    () => {
      routerCalls += 1;
    },
  );
  assert.equal(current, 0);
  assert.equal(parent, 1);
  assert.equal(routerCalls, 0);
});

test('popStackOrParent uses router when no navigator can go back', () => {
  let routerCalls = 0;
  popStackOrParent(
    {
      canGoBack: () => false,
      goBack: () => undefined,
      getParent: () => ({
        canGoBack: () => false,
        goBack: () => undefined,
      }),
    },
    () => {
      routerCalls += 1;
    },
    () => true,
  );
  assert.equal(routerCalls, 1);
});
