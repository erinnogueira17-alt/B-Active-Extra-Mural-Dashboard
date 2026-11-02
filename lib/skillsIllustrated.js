// The skills children should be able to demonstrate, by sport and age group.
// Each skill has the illustration from the sport's skills sheet and its name as
// written on the sheet. Images are in public/curriculum/skills-2d/ and are named
// <sport>-<age>-<number>.jpg, with the age group written as 2-4, 4-6 and 7-plus.

const img = (sport, age, n) => `/curriculum/skills-2d/${sport}-${age}-${n}.jpg`;

function skills(sport, age, names) {
  return names.map((name, i) => ({ name, img: img(sport, age, i + 1) }));
}

export const SKILLS_2D = {
  netball: {
    "2–4": skills("netball", "2-4", ["Hops over a cone", "Bounces and catches with two hands", "Tosses and catches a ball", "Chest and bounce pass into a hoop at 1 m", "Shoulder-pass action, one hand", "Throws into a low hoop"]),
    "4–6": skills("netball", "4-6", ["One-leg hops over cones", "Bounce, clap, catch", "Chest, bounce and shoulder pass at a 3 m target", "Catches after one bounce", "Shoots with bent knees, feet still"]),
    "7+": skills("netball", "7-plus", ["Pivots on the landing foot", "All three passes accurate at 5 m", "Lands on one foot and holds balance", "Catches with one hand", "Shoots with footwork from 3 m", "Knows the footwork rule"]),
  },
  rugby: {
    "2–4": skills("rugby", "2-4", ["Jumping jacks and squats with a ball", "Carries the ball tight", "Tosses and catches", "Pocket pass into a hoop", "Picks up the ball with two hands", "Scores a try with a hand-off and spin"]),
    "4–6": skills("rugby", "4-6", ["Spin-catch while walking", "Pocket pass to a target at 2–3 m", "Scoops up the ball while jogging", "Hand-off, tornado and side step", "Scores a try with two hands"]),
    "7+": skills("rugby", "7-plus", ["Spin-catches on the run", "Pocket pass on the run, both sides", "Scoops a rolling ball at speed", "Carries in the outside arm", "Combines side step and hand-off", "Knows the no-forward-pass rule"]),
  },
  soccer: {
    "2–4": skills("soccer", "2-4", ["Toe touches", "Slow step-over", "Knee and catch", "Dribbles and stops on “Red!”", "Kicks through a gate", "Scores into a goal"]),
    "4–6": skills("soccer", "4-6", ["Toe touches and step-overs ×10", "Knee and catch while walking", "Dribbles, stops and turns on command", "Inside-foot pass through a gate at 4 m", "Shoots on target from 4 m", "Catches like a keeper"]),
    "7+": skills("soccer", "7-plus", ["Juggles 5 knee touches", "Step-overs and drag-backs with both feet", "Dribbles at speed with both feet", "Passes with the weaker foot", "Shoots low into a corner from 6 m", "Keeper basics: stance, catch, dive"]),
  },
  hockey: {
    "2–4": skills("hockey", "2-4", ["Holds the stick with both hands", "Pushes the ball with the flat side", "Stops the ball with the stick", "Push pass with no swing", "Shoots into a cone goal", "Keeps the stick low"]),
    "4–6": skills("hockey", "4-6", ["Correct grip and stance", "Dribbles and traps the ball", "Push pass through a gate at 3 m", "Stops the ball dead, then passes", "Shoots into a goal", "Stick below the hips"]),
    "7+": skills("hockey", "7-plus", ["Ready stance, eyes up", "Side-to-side dribble", "Push pass to 5 m through a gate", "Stops, turns and passes", "Shoots past a keeper from 5 m", "Knows basic field rules"]),
  },
  tennis: {
    "2–4": skills("tennis", "2-4", ["Ninja kicks with both legs", "Bounce and catch with two hands", "Tosses and catches", "Balances a ball on a flat racket", "Hits a ball off a cone", "Pats a balloon up"]),
    "4–6": skills("tennis", "4-6", ["Ninja kick and freeze", "Bounce and catch with one hand", "Throw and one-hand catch", "One-hand balance round a cone", "Taps the ball up 1–3 times", "Drop-and-hit forehand"]),
    "7+": skills("tennis", "7-plus", ["Racket dribble ×10", "10 taps up in a row", "Forehand and backhand off a cone", "Drop-hit to a target", "Knows forehand vs backhand grip", "Ready position between shots"]),
  },
};
