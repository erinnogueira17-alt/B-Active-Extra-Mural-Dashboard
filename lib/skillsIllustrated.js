// The skills children should be able to demonstrate, by sport and age group.
// Each skill has the name and a short written description from the sport's skills
// sheet, and the illustration. Images are in public/curriculum/skills-2d/ and are
// named <sport>-<age>-<number>.jpg, with the age group written as 2-4, 4-6 and 7-plus.

const img = (sport, age, n) => `/curriculum/skills-2d/${sport}-${age}-${n}.jpg`;

function skills(sport, age, list) {
  return list.map(([name, description], i) => ({ name, description, img: img(sport, age, i + 1) }));
}

export const SKILLS_2D = {
  netball: {
    "2–4": skills("netball", "2-4", [
      ["Hops over a cone", "Hops over a cone with both feet together and lands softly."],
      ["Bounces and catches with two hands", "Bounces the ball with both hands and catches it with two hands."],
      ["Tosses and catches a ball", "Tosses the ball up with both hands and catches it."],
      ["Chest and bounce pass into a hoop at 1 m", "Passes from the chest, or with a bounce, into a hoop about 1 m away."],
      ["Shoulder-pass action, one hand", "Uses one hand to push the ball from the shoulder and follows through."],
      ["Throws into a low hoop", "Throws the ball into a low hoop."],
    ]),
    "4–6": skills("netball", "4-6", [
      ["One-leg hops over cones", "Hops on one leg over two cones, then switches legs."],
      ["Bounce, clap, catch", "Bounces the ball, claps once, and catches it."],
      ["Chest, bounce and shoulder pass at a 3 m target", "Makes a chest, bounce or shoulder pass to a target 3 m away."],
      ["Catches after one bounce", "Catches a ball that has bounced once, with two hands."],
      ["Shoots with bent knees, feet still", "Bends the knees and shoots at the hoop without moving the feet."],
    ]),
    "7+": skills("netball", "7-plus", [
      ["Pivots on the landing foot", "Lands on both feet after a jump and turns on one foot without lifting it."],
      ["All three passes accurate at 5 m", "Makes the chest, bounce and shoulder passes, each accurate at 5 m."],
      ["Lands on one foot and holds balance", "Lands on one foot and holds the balance."],
      ["Catches with one hand", "Catches a ball with one hand."],
      ["Shoots with footwork from 3 m", "Uses the correct footwork and shoots from 3 m."],
      ["Knows the footwork rule", "Knows that after catching, a player must land and pivot on one foot before passing or shooting."],
    ]),
  },
  rugby: {
    "2–4": skills("rugby", "2-4", [
      ["Jumping jacks and squats with a ball", "Does jumping jacks, then squats while holding a ball."],
      ["Carries the ball tight", "Holds the ball tight against the body while walking or running."],
      ["Tosses and catches", "Tosses the ball up and catches it."],
      ["Pocket pass into a hoop", "Passes from the side of the body into a hoop."],
      ["Picks up the ball with two hands", "Bends down and picks the ball up with two hands."],
      ["Scores a try with a hand-off and spin", "Hands off a defender, spins, and places the ball over the line."],
    ]),
    "4–6": skills("rugby", "4-6", [
      ["Spin-catch while walking", "Catches a thrown ball while walking, spinning as they take it."],
      ["Pocket pass to a target at 2–3 m", "Pocket-passes to a target 2–3 m away."],
      ["Scoops up the ball while jogging", "Scoops the ball up off the ground while jogging."],
      ["Hand-off, tornado and side step", "Hands off, turns in a tornado, then side-steps past a cone."],
      ["Scores a try with two hands", "Carries the ball in two hands and places it down over the line."],
    ]),
    "7+": skills("rugby", "7-plus", [
      ["Spin-catches on the run", "Catches a pass while running, spinning to take the ball."],
      ["Pocket pass on the run, both sides", "Pocket-passes on the run, from both sides of the body."],
      ["Scoops a rolling ball at speed", "Scoops up a rolling ball at speed without slowing down."],
      ["Carries in the outside arm", "Carries the ball in the arm furthest from the defender."],
      ["Combines side step and hand-off", "Side-steps, then hands off, in one smooth movement."],
      ["Knows the no-forward-pass rule", "Knows the ball must never be passed forward, only sideways or backward."],
    ]),
  },
  soccer: {
    "2–4": skills("soccer", "2-4", [
      ["Toe touches", "Taps the ball back and forth with the toe of one foot, then the other."],
      ["Slow step-over", "Steps slowly over the ball, then touches it with the other foot."],
      ["Knee and catch", "Bounces the ball on the knee and catches it with the hands."],
      ["Dribbles and stops on “Red!”", "Dribbles with small touches and stops the ball with a foot when the coach calls “Red!”"],
      ["Kicks through a gate", "Kicks the ball through a gate made of two cones."],
      ["Scores into a goal", "Kicks the ball into a goal."],
    ]),
    "4–6": skills("soccer", "4-6", [
      ["Toe touches and step-overs ×10", "Does ten toe touches, then ten step-overs."],
      ["Knee and catch while walking", "Walks while bouncing the ball on the knee and catching it."],
      ["Dribbles, stops and turns on command", "Dribbles, then stops and turns when the coach calls."],
      ["Inside-foot pass through a gate at 4 m", "Passes with the inside of the foot through a gate 4 m away."],
      ["Shoots on target from 4 m", "Shoots at a target from 4 m."],
      ["Catches like a keeper", "Catches a ball thrown high, with the hands in front of the body."],
    ]),
    "7+": skills("soccer", "7-plus", [
      ["Juggles 5 knee touches", "Juggles the ball with five knee touches and catches it."],
      ["Step-overs and drag-backs with both feet", "Does step-overs and drag-backs with each foot."],
      ["Dribbles at speed with both feet", "Dribbles at speed, using both feet."],
      ["Passes with the weaker foot", "Passes accurately with the weaker foot."],
      ["Shoots low into a corner from 6 m", "Shoots low into a corner from 6 m."],
      ["Keeper basics: stance, catch, dive", "Takes a keeper stance, catches a ball, and dives to save a shot."],
    ]),
  },
  hockey: {
    "2–4": skills("hockey", "2-4", [
      ["Holds the stick with both hands", "Holds the stick with both hands, flat side down."],
      ["Pushes the ball with the flat side", "Pushes the ball along the ground with the flat side of the stick."],
      ["Stops the ball with the stick", "Stops a rolling ball with the stick."],
      ["Push pass with no swing", "Passes the ball with a push, without swinging the stick."],
      ["Shoots into a cone goal", "Pushes the ball into a cone goal."],
      ["Keeps the stick low", "Keeps the stick low while moving."],
    ]),
    "4–6": skills("hockey", "4-6", [
      ["Correct grip and stance", "Holds the stick with the correct grip and stands with the knees bent."],
      ["Dribbles and traps the ball", "Dribbles with the flat side, then traps the ball to stop it."],
      ["Push pass through a gate at 3 m", "Passes with a push through a gate 3 m away."],
      ["Stops the ball dead, then passes", "Stops the ball completely, then passes."],
      ["Shoots into a goal", "Hits the ball into a goal."],
      ["Stick below the hips", "Keeps the stick below the hips at all times."],
    ]),
    "7+": skills("hockey", "7-plus", [
      ["Ready stance, eyes up", "Stands in a ready stance with eyes up."],
      ["Side-to-side dribble", "Dribbles from side to side, keeping the ball close to the stick."],
      ["Push pass to 5 m through a gate", "Passes with a push through a gate 5 m away."],
      ["Stops, turns and passes", "Stops the ball, turns, and passes."],
      ["Shoots past a keeper from 5 m", "Shoots from 5 m past a keeper."],
      ["Knows basic field rules", "Knows basic rules, such as keeping the stick low and playing the ball, not the player."],
    ]),
  },
  tennis: {
    "2–4": skills("tennis", "2-4", [
      ["Ninja kicks with both legs", "Kicks both legs up, like a ninja, and lands."],
      ["Bounce and catch with two hands", "Bounces the ball and catches it with two hands."],
      ["Tosses and catches", "Tosses the ball up and catches it."],
      ["Balances a ball on a flat racket", "Balances a ball on a flat racket."],
      ["Hits a ball off a cone", "Hits a ball off a cone with the racket."],
      ["Pats a balloon up", "Pats a balloon upward and keeps it in the air."],
    ]),
    "4–6": skills("tennis", "4-6", [
      ["Ninja kick and freeze", "Kicks one leg up and freezes."],
      ["Bounce and catch with one hand", "Bounces the ball and catches it with one hand."],
      ["Throw and one-hand catch", "Throws the ball up and catches it with one hand."],
      ["One-hand balance round a cone", "Balances the racket on one hand while moving round a cone."],
      ["Taps the ball up 1–3 times", "Taps the ball up with the racket 1–3 times."],
      ["Drop-and-hit forehand", "Drops the ball and hits it with a forehand."],
    ]),
    "7+": skills("tennis", "7-plus", [
      ["Racket dribble ×10", "Bounces the ball on the racket ten times."],
      ["10 taps up in a row", "Taps the ball up with the racket ten times in a row."],
      ["Forehand and backhand off a cone", "Hits a forehand and a backhand off a cone."],
      ["Drop-hit to a target", "Drops the ball and hits it to a target."],
      ["Knows forehand vs backhand grip", "Knows the grip for a forehand and for a backhand."],
      ["Ready position between shots", "Returns to a ready position between shots."],
    ]),
  },
};
