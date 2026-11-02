import test from "node:test";
import assert from "node:assert/strict";
import { WEEKLY_PLANS, WEEKLY_AGES, GAME_PLAY_COACHING } from "./weeklyPlans/index.js";

const SPORT_KEYS = ["netball", "rugby", "soccer", "hockey", "tennis"];
const AGE_KEYS = WEEKLY_AGES.map((a) => a.key);

test("every week lists the five sports", () => {
  for (const week of WEEKLY_PLANS) {
    assert.deepEqual(Object.keys(week.sports).sort(), [...SPORT_KEYS].sort(), `week ${week.week}`);
  }
});

test("each sport has a focus line and all three age groups with activities", () => {
  for (const week of WEEKLY_PLANS) {
    for (const sportKey of SPORT_KEYS) {
      const sport = week.sports[sportKey];
      const where = `week ${week.week} ${sportKey}`;
      assert.ok(sport.focus && sport.focus.trim().length > 0, `${where} has a focus`);
      for (const age of AGE_KEYS) {
        const items = sport.ages[age];
        assert.ok(Array.isArray(items) && items.length >= 3, `${where} ${age} has at least 3 activities`);
        for (const item of items) {
          assert.equal(typeof item, "string", `${where} ${age} item is text`);
          assert.ok(item.trim().length > 0, `${where} ${age} has no empty activity`);
        }
      }
    }
  }
});

test("weeks are in order and cover the weeks in the uploaded sheets", () => {
  assert.deepEqual(WEEKLY_PLANS.map((w) => w.week), [1, 4, 5, 9, 18]);
});

test("week 18 coaching tips are present for each sport", () => {
  const w18 = WEEKLY_PLANS.find((w) => w.week === 18);
  for (const sportKey of SPORT_KEYS) {
    assert.ok(w18.sports[sportKey].tips.length >= 3, `week 18 ${sportKey} has coaching tips`);
  }
});

test("game-play coaching guide has four tip groups", () => {
  assert.equal(GAME_PLAY_COACHING.tips.length, 4);
  for (const tip of GAME_PLAY_COACHING.tips) assert.ok(tip.points.length >= 2);
});
