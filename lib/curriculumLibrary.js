// Skills library for the Curriculum tab. Source: the five B-Active skills
// demonstration sheets (netball, rugby, soccer, hockey, tennis). Each sport has
// a warm-up, five skill blocks, and games. Each age group (2–4, 4–6, 7+) has
// its own wording for every block. Lessons are built from these blocks.

export const AGE_GROUPS = ["2–4", "4–6", "7+"];

export const AGE_COLOUR = { "2–4": "#e0b04a", "4–6": "#c8232a", "7+": "#1d1a17" };

export const COACH_TIPS =
  "Demo in the middle, then everyone goes together. Walk round the stations and help 2–4s hand-over-hand. Count and challenge 4–6s. Coach technique and speed for 7+.";

export const SPORTS = [
  {
    key: "netball",
    name: "Netball",
    colour: "#1d5f7a",
    picto: "/curriculum/netball.png",
    setup: "/curriculum/skills/netball-setup.png",
    equipment: "1 netball (soft size 3 for 2–4s), 2 cones and 1 hoop (flat on the floor or on a cone stack)",
    warm: {
      name: "Hop and touch",
      cue: "Hop and touch",
      img: "/curriculum/skills/netball-1.png",
      ages: {
        "2–4": "Bunny hop over your cones ×10. Bum kicks to the middle cone and back.",
        "4–6": "One-leg hops over your cones ×10 each leg. Bum kicks to the middle cone and back.",
        "7+": "Skips and side-steps to the middle cone. One-leg hops with a 2-second landing hold.",
      },
    },
    blocks: [
      { name: "Bounce and catch", cue: "Push down, catch with two hands", img: "/curriculum/skills/netball-2.png", ages: {
        "2–4": "Bounce and catch with two hands ×10.",
        "4–6": "Bounce, clap, catch ×10. Then bounce the ball to your middle cone.",
        "7+": "Bounce with your weaker hand. Bounce, pivot, catch ×10.",
      } },
      { name: "Throw and catch", cue: "Eyes on the ball", img: "/curriculum/skills/netball-3.png", ages: {
        "2–4": "Small toss up, catch at your tummy ×10.",
        "4–6": "Throw up, clap, catch ×10. Around the world: toes, knees, tummy.",
        "7+": "Throw high, turn a full circle, catch ×5. Then one-hand catches.",
      } },
      { name: "Passing to a target", cue: "Chest, bounce, shoulder", img: "/curriculum/skills/netball-4.png", ages: {
        "2–4": "Chest pass and bounce pass into the hoop 1 m away ×5 each. Shoulder pass with a light ball ×5.",
        "4–6": "From 3 m: chest pass at the target, bounce pass into the hoop, shoulder pass over the middle cone. ×5 each.",
        "7+": "From 5 m: all three passes at the target, alternating. 10 in a row without a miss.",
      } },
      { name: "Reaction grab", cue: "Head… shoulders… knees… BALL!", img: "/curriculum/skills/netball-5.png", ages: {
        "2–4": "Ball on your cone. Grab it on \"BALL!\"",
        "4–6": "Faster calls. Then drop the ball from shoulder height and catch after one bounce.",
        "7+": "Coach calls a pass type: grab the ball and throw that pass at your target.",
      } },
      { name: "Shooting", cue: "Bend your knees, push up", img: "/curriculum/skills/netball-6.png", ages: {
        "2–4": "Two hands into your hoop from 1 m.",
        "4–6": "From 2 m, feet still, bend and push up. Goals out of 5.",
        "7+": "From 3 m with footwork: land, balance, shoot. Goals out of 10.",
      } },
    ],
    games: [
      { name: "Freeze and shoot", text: "Run with the ball. On \"Freeze!\" stop your feet, then shoot at the hoop." },
      { name: "Cannonball", text: "Coaches roll soft balls across the area. Dodge and keep your own ball under control." },
    ],
    regressions: ["Softer, bigger ball", "Roll the ball into the hoop first", "Lower the hoop or stand closer", "Two hands for every pass"],
    progressions: ["Throw, clap, catch", "Pivoting on one foot", "Raise the hoop", "Move the target further away"],
  },
  {
    key: "rugby",
    name: "Rugby",
    colour: "#2e6b3f",
    picto: "/curriculum/rugby.png",
    setup: "/curriculum/skills/rugby-setup.png",
    equipment: "1 mini rugby ball (size 4 for 7+), 2 cones (start, defender) and 1 hoop",
    warm: {
      name: "Star jumps and squats",
      cue: "Star jumps and squats",
      img: "/curriculum/skills/rugby-1.png",
      ages: {
        "2–4": "Jumping jacks ×10. Squats ×10, holding the ball.",
        "4–6": "Jumping jacks ×10. Squats ×10, holding the ball.",
        "7+": "Jumping jacks, squats and burpees ×10, ball in hand.",
      },
    },
    blocks: [
      { name: "Fetch and carry", cue: "Rugby ball! 10 seconds!", img: "/curriculum/skills/rugby-2.png", ages: {
        "2–4": "Run to the ball at the end of your station, hug it, run back round your middle cone.",
        "4–6": "Fetch, then weave back round your cones with two hands on the ball.",
        "7+": "Sprint, scoop, carry in the outside arm, weave both ways round your cones.",
      } },
      { name: "Spin and catch", cue: "Hands up, eyes on the ball", img: "/curriculum/skills/rugby-3.png", ages: {
        "2–4": "Toss the ball up a little, catch it, hug it in ×10.",
        "4–6": "Spin the ball up and catch ×10. Then while walking.",
        "7+": "Spin the ball up while jogging and catch ×10, hands up early.",
      } },
      { name: "Pocket pass", cue: "Swing across, follow through", img: "/curriculum/skills/rugby-4.png", ages: {
        "2–4": "Pocket pass into the hoop 1 m away ×10, then fetch.",
        "4–6": "Pocket pass to the target 2–3 m away ×10, both sides.",
        "7+": "Pocket pass on the run to the target, both sides, 5 each.",
      } },
      { name: "Ball pick-up", cue: "Get low, scoop, go", img: "/curriculum/skills/rugby-5.png", ages: {
        "2–4": "Bend down, pick the ball up with two hands and hug it ×5.",
        "4–6": "Jog to the ball and scoop it up without stopping. Carry it to your next cone.",
        "7+": "Scoop a rolling ball at speed, carry it under the outside arm and score.",
      } },
      { name: "Score a try", cue: "HAND OFF! TORNADO! SIDE STEP!", img: "/curriculum/skills/rugby-6.png", ages: {
        "2–4": "On \"GO!\" run past the defender cone with a hand-off and a spin. Place the ball over the line.",
        "4–6": "Beat the defender cone with a hand-off, tornado or side step. Score with two hands.",
        "7+": "Combine moves: side step, then hand-off, then a two-handed try at speed.",
      } },
    ],
    games: [
      { name: "Swim fishy", text: "Kids cross holding the ball. On \"SHARK!\", coaches chase and kids protect it." },
      { name: "Score a try against the coach", text: "One at a time, beat the coach with a hand-off, spin or side step." },
      { name: "Catch and score", text: "Catch the coach's toss, run to the line and place the ball down." },
    ],
    regressions: ["Bigger, softer ball", "Walk the try, no running", "Bigger hoop target", "Ball still on the ground for pick-ups"],
    progressions: ["Spin-catch while walking", "Pocket pass on the run", "Scoop a rolling ball at speed", "Ball pick-up under pressure"],
  },
  {
    key: "soccer",
    name: "Soccer",
    colour: "#9b1b2c",
    picto: "/curriculum/soccer.png",
    setup: "/curriculum/skills/soccer-setup.png",
    equipment: "1 size 3 ball and 5 cones (start, gate, two-cone goal). The coach needs a red and a green cone",
    warm: {
      name: "Red light, green light",
      cue: "Green go, red freeze",
      img: "/curriculum/skills/soccer-1.png",
      ages: {
        "2–4": "Fetch your ball from the far end and carry it back.",
        "4–6": "Fetch your ball and dribble it back to your start cone.",
        "7+": "Red light, green light at speed with the ball. Add \"Yellow!\" for a slow dribble.",
      },
    },
    blocks: [
      { name: "Ball mastery", cue: "Light, quick feet", img: "/curriculum/skills/soccer-2.png", ages: {
        "2–4": "Toe touches ×10, slow step-overs ×5, drop and stop ×5.",
        "4–6": "Toe touches ×10, step-overs ×10, drop and stop with the sole ×5.",
        "7+": "Step-overs with both feet ×10, sole rolls ×10, drag-backs ×5.",
      } },
      { name: "Knee and catch", cue: "Drop, knee, catch", img: "/curriculum/skills/soccer-3.png", ages: {
        "2–4": "Drop the ball onto your knee and catch it ×5.",
        "4–6": "Knee and catch ×5, then while walking. Try two knee juggles.",
        "7+": "Knee juggles: aim for 5 in a row, then alternate knees.",
      } },
      { name: "Dribble and stop", cue: "Little taps", img: "/curriculum/skills/soccer-4.png", ages: {
        "2–4": "Walk the dog to your gate and back. Foot on the ball on \"Red!\"",
        "4–6": "Dribble round your gate and back. \"Turn!\", \"Other foot!\", sole trap on \"Red!\"",
        "7+": "Dribble at speed round your cones with both feet. Cut and turn on command.",
      } },
      { name: "Pass through the gate", cue: "Side of the foot", img: "/curriculum/skills/soccer-5.png", ages: {
        "2–4": "Kick a still ball through your gate 2 m away ×5.",
        "4–6": "Inside-foot pass through the gate from 4 m ×5, then off a moving ball.",
        "7+": "Weaker-foot pass through a narrow gate from 5 m ×5.",
      } },
      { name: "Shoot and keep goal", cue: "Look, then kick", img: "/curriculum/skills/soccer-6.png", ages: {
        "2–4": "Shoot into your goal from 2 m. Keeper: roll it out, scoop it up.",
        "4–6": "Shoot at a corner from 4–5 m. Keeper: toss it up, catch with two hands.",
        "7+": "Shoot low into a corner from 6 m. Keeper: dive to save a ball you roll out.",
      } },
    ],
    games: [
      { name: "Red light, green light", text: "Green = dribble, red = foot on the ball. Moving on red: back to start." },
      { name: "Cannonball", text: "Coaches roll soft balls across the area. Dodge and keep your own ball under control." },
      { name: "Steal the ball", text: "The coach tries to steal balls. Everyone shields theirs and keeps dribbling." },
    ],
    regressions: ["Ball stays still before each kick", "Walk, don't run, when dribbling", "Bigger gate and goal, closer in", "Catch the ball before the knee"],
    progressions: ["Knee and catch while moving", "Knee juggling", "Weaker-foot passing", "Keeper: dive to save"],
  },
  {
    key: "hockey",
    name: "Hockey",
    colour: "#3b5b8c",
    picto: "/curriculum/hockey.png",
    setup: "/curriculum/skills/hockey-setup.png",
    equipment: "1 junior stick, 1 ball and 5 cones (start, gate, two-cone goal)",
    warm: {
      name: "Carefully fetch your stick",
      cue: "Carefully fetch your stick",
      img: "/curriculum/skills/hockey-1.png",
      ages: {
        "2–4": "Run to your middle cone and back. Fetch the stick, head down by your side.",
        "4–6": "Same, then name the parts: handle, nose, flat side, round side.",
        "7+": "Jog with the stick low in two hands. Name every part and the no-swing rule.",
      },
    },
    blocks: [
      { name: "Grip and stance", cue: "Both hands, knees bent", img: "/curriculum/skills/hockey-2.png", ages: {
        "2–4": "Both hands on the stick, feet apart, knees bent, stick flat on the ground.",
        "4–6": "Left hand on top, right hand lower, flat side facing the ball.",
        "7+": "Ready stance: knees bent, stick down, eyes up. Change grip on the coach's call.",
      } },
      { name: "Dribble and trap", cue: "Keep it close", img: "/curriculum/skills/hockey-3.png", ages: {
        "2–4": "Push the ball with the flat side to the gate and back. Stop it on \"Freeze!\"",
        "4–6": "Dribble round your cones and back. Trap it dead on \"Freeze!\" Side to side if ready.",
        "7+": "Side-to-side dribble round your cones, eyes up. Trap on \"Freeze!\"",
      } },
      { name: "Push through the gate", cue: "Step and push, no swing", img: "/curriculum/skills/hockey-4.png", ages: {
        "2–4": "Push the ball through your gate 1–2 m away ×5.",
        "4–6": "From 3 m, step and push through the gate ×5.",
        "7+": "Push a moving ball through a narrow gate from 5 m ×5.",
      } },
      { name: "Stop the ball", cue: "Stick down, stop it dead", img: "/curriculum/skills/hockey-5.png", ages: {
        "2–4": "Push the ball ahead, chase it, stop it with the stick ×5.",
        "4–6": "Push, chase, stop it dead, then push it through the gate.",
        "7+": "Push, chase, stop with the flat side, turn and push back ×5.",
      } },
      { name: "Shooting", cue: "Dribble, stop, shoot", img: "/curriculum/skills/hockey-6.png", ages: {
        "2–4": "Push the ball into your cone goal from 1–2 m.",
        "4–6": "Dribble, stop, then push-shoot into the goal from 3 m.",
        "7+": "Dribble at speed, stop, shoot past a cone keeper from 5 m.",
      } },
    ],
    games: [
      { name: "Dribble and freeze", text: "Dribble anywhere. On \"Freeze!\", stop the ball dead with the stick." },
      { name: "Putt putt", text: "Push the ball through cone gates, like mini golf." },
      { name: "Clean the room", text: "Push balls into the other half. Fewest balls in your half wins." },
    ],
    regressions: ["Walk the ball, no running", "Coach's hand on the stick too", "Bigger gates and goals", "Stop the ball before every push"],
    progressions: ["Goalkeeper knowledge", "One hand loose on the stick to rotate it", "Side-to-side dribbling", "Field rules"],
  },
  {
    key: "tennis",
    name: "Tennis",
    colour: "#6b8e23",
    picto: "/curriculum/tennis.png",
    setup: "/curriculum/skills/tennis-setup.png",
    equipment: "1 mini racket, 1 low-bounce or foam ball, 1 balloon and 3 cones (one tall)",
    warm: {
      name: "Ninja kicks",
      cue: "Kick and freeze",
      img: "/curriculum/skills/tennis-1.png",
      ages: {
        "2–4": "Kick up to knee height, each leg ×5.",
        "4–6": "Kick to waist height, then a 3-second ninja freeze. Each leg ×5.",
        "7+": "Ninja kick, freeze 5 seconds with arms out, switch legs ×5.",
      },
    },
    blocks: [
      { name: "Bounce and catch", cue: "Drop, bounce, catch", img: "/curriculum/skills/tennis-2.png", ages: {
        "2–4": "Drop the ball, catch after one bounce with two hands ×10.",
        "4–6": "One hand ×10. Then bounce, clap, catch.",
        "7+": "Bounce the ball down with the racket ×10 (racket dribble).",
      } },
      { name: "Throw and catch", cue: "Soft hands", img: "/curriculum/skills/tennis-3.png", ages: {
        "2–4": "Toss up low and catch ×10.",
        "4–6": "Throw higher, catch with one hand ×10.",
        "7+": "Throw up, let it bounce, catch with the other hand ×10.",
      } },
      { name: "Racket balance", cue: "Flat like a pancake", img: "/curriculum/skills/tennis-4.png", ages: {
        "2–4": "Two hands, ball on a flat racket. Walk to your middle cone and back.",
        "4–6": "One hand, round your middle cone and back. Then tap it up 1–3 times.",
        "7+": "Tap the ball up 10 in a row, then alternate racket faces.",
      } },
      { name: "Hit off the cone", cue: "Say FOREHAND!", img: "/curriculum/skills/tennis-5.png", ages: {
        "2–4": "Ball on a tall cone. Swing slowly and knock it off ×5.",
        "4–6": "Forehand it off the cone towards your target cone ×5.",
        "7+": "Forehand and two-hand backhand off the cone to the target, ×5 each.",
      } },
      { name: "Drop and hit", cue: "Drop, bounce, hit", img: "/curriculum/skills/tennis-6.png", ages: {
        "2–4": "Pat a balloon up with the racket ×10.",
        "4–6": "Drop the ball, let it bounce once, forehand towards your target ×5.",
        "7+": "Drop-hit forehands and backhands. Count the hits that land in the target zone.",
      } },
    ],
    games: [
      { name: "Balance, move and freeze", text: "Walk with the ball on your racket. Freeze on \"Stop!\" without dropping it." },
      { name: "Hit the ball off the cone", text: "Ball on a tall cone. Swing and knock it towards your target." },
      { name: "Splat", text: "Drop the ball and flatten it with the racket face before it rolls away." },
    ],
    regressions: ["Balloon instead of a ball", "Two hands on the handle", "Bigger foam ball", "Hit off a cone before a dropped ball"],
    progressions: ["Rally against a wall", "Bounce and catch with one hand", "Tap the ball up on the racket", "Serve through a hoop"],
  },
];

// Five lessons per sport and age group. Each lesson puts one skill block at the
// centre, with the sheet's warm-up, the other blocks, and a game.
// Timing for a 30-minute lesson: warm-up 3, focus block 9, the other four blocks 3 each,
// game 3, wrap-up 3.
export function lessonsFor(sport, age) {
  return [0, 1, 2, 3, 4].map((k) => {
    const focus = sport.blocks[k];
    const others = sport.blocks.filter((_, i) => i !== k);
    const flow = [
      { name: "Warm-up", minutes: 3, focus: false, img: sport.warm.img, text: sport.warm.ages[age] },
      { name: focus.name, minutes: 9, focus: true, img: focus.img, text: focus.ages[age], cue: focus.cue },
      ...others.map((b) => ({ name: b.name, minutes: 3, focus: false, img: b.img, text: b.ages[age], cue: b.cue })),
      { name: "Game", minutes: 3, focus: false, text: sport.games[k % sport.games.length].text, gameName: sport.games[k % sport.games.length].name },
      { name: "Wrap-up", minutes: 3, focus: false, text: "Cool down, then talk through what was hard and what was fun." },
    ];
    return { number: k + 1, title: `Lesson ${k + 1}`, focus: focus.name, flow, total: flow.reduce((n, x) => n + x.minutes, 0) };
  });
}
