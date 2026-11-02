import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SKILLS_2D } from "./skillsIllustrated.js";

const expected = { netball: [6, 5, 6], rugby: [6, 5, 6], soccer: [6, 6, 6], hockey: [6, 6, 6], tennis: [6, 6, 6] };
const ages = ["2–4", "4–6", "7+"];
const publicDir = fileURLToPath(new URL("../public", import.meta.url));

test("every sport has the skills from its sheet for each age group", () => {
  for (const [sport, counts] of Object.entries(expected)) {
    ages.forEach((age, i) => {
      const list = SKILLS_2D[sport][age];
      assert.equal(list.length, counts[i], `${sport} ${age} skill count`);
      for (const s of list) {
        assert.ok(s.name.trim().length > 0, `${sport} ${age} skill has a name`);
        assert.ok(existsSync(publicDir + s.img), `${s.img} exists`);
      }
    });
  }
});
