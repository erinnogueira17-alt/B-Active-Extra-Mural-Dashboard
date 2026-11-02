// Term 1 curriculum: the term structure, lesson plans and equipment.
// Dates are deliberately left out; the term runs in the order listed.

// ---- Term 1 structure, from the year planner ----
export const BLOCKS = {
  demo: { name: "Demo lessons" },
  ice: { name: "Ice breaker lessons" },
  sport: { name: "Sport-specific lessons" },
  hol: { name: "Holiday programme" }
};
export const TERM = [
  { b: "demo", lesson: null, note: "Demo lessons. No written plan yet." },
  { b: "demo", lesson: null, note: "Demo lessons. No written plan yet." },
  { b: "ice", lesson: "N1" },
  { b: "ice", lesson: "R1" },
  { b: "ice", lesson: "S1" },
  { b: "ice", lesson: "N2" },
  { b: "ice", lesson: "R2" },
  { b: "ice", lesson: "S2" },
  { b: "sport", phase: "Phase 1: basic skills", lesson: "N3" },
  { b: "sport", phase: "Phase 1: basic skills", lesson: "R3" },
  { b: "sport", phase: "Phase 2: partner work", lesson: "S3" },
  { b: "hol", lesson: null, note: "Holiday programme. No written plan here." }
];

// ---- Lessons. N1, N2, R1 and S1 are the coaches' sheets (spelling tidied only). Everything else is a DRAFT. ----
export const AGES = ["2–4", "4–6", "7+"];
export const WAIT = "Not written yet. This age group will be added in the next review.";
export const WAIT_1_2 = "See the 1–2 year programme (to be supplied separately).";
export const EQUIP = {
  Netball: ["Cones (ring)", "One ball per student", "Whistle", "Stickers"],
  Rugby: ["Cones in three lines", "Balls (one per student)", "Whistle", "Bean bags or flags", "Stickers"],
  Soccer: ["Cones in four colours", "One ball per student", "Whistle", "Stickers"],
  Hockey: ["Junior stick per student", "One ball per student", "Cones", "Stickers"],
  Tennis: ["Mini racket per student", "Foam ball per student", "Balloon per student", "Cones"]
};
export const S = (t, b, l) => ({ t: t, b: b || "", l: l || [] });
// Sport pictograms, uploaded to this page as assets.
export const PICTO = {
  Netball: { src: "/curriculum/netball.png", alt: "Netball player shooting at a hoop" },
  Rugby: { src: "/curriculum/rugby.png", alt: "Rugby player running with the ball" },
  Soccer: { src: "/curriculum/soccer.png", alt: "Soccer player running with the ball" }
};

export const LESSONS = {
  N1: { title: "Netball lesson 01", sport: "Netball", phase: "Ice breaker", form: "circle", formText: "Circle", draft: false,
    ages: {
      "2–4": [
        S("Warm up", "Magic wand: I have a magical wand that turns you into animals. Abra cadabra… BOOM, you're a:", ["Cheetah: run around the circle back to the cone", "Giraffe: walk on your toes around the circle", "Bunny: hop around the circle", "Bear: crawl around the circle", "Back at the cone: plank for 10 seconds, then wave left arm and right arm. Rest and repeat with the legs."]),
        S("Ice breaker: Jumping game", "First complete body-awareness tasks, e.g. hands on your nose. Students hold hands in a circle and do not let go while you call:", ["All sit down, then all stand up", "All raise hands up, then hands down", "Walk to the centre, then walk backwards out", "Walk to the left, then walk to the right"]),
        S("Skill game: Freeze catch", "Each student has a ball. Ask: what is this ball, and what shape is it?", ["Roll the ball round the circle with your fingertips: \"tickle the ball\"", "Bounce and catch around the circle, following the coach", "Throw and catch around the circle in the opposite direction", "Go back to your cone with the ball. Using a hula hoop, walk round the circle, push the ball through and fetch it again. Repeat 2 times."])
      ],
      "4–6": [
        S("Warm up", "", ["Run around the circle back to the cone", "Walk on your toes around the circle like a giraffe", "Jump around the circle like a bunny", "Bear crawl around the circle", "Back at the cone: plank for 10 seconds, then wave left arm and right arm. Rest and repeat with the legs."]),
        S("Ice breaker: Jumping game", "First complete body-awareness tasks, e.g. hands on your nose. Then hold hands in a circle. On command, jump in or jump out together. Keep going until the group is in rhythm."),
        S("Skill game: Freeze catch", "Each student has a ball. Bounce and catch following the coach. Throw and catch in the opposite direction.", ["Coach stands in the middle", "Students bounce-catch their ball while walking towards the coach", "On command, students freeze with the ball in their hand. If they move, they start again from the beginning.", "When enough students have reached the coach, chase them back to their cones to play again", "Change it by performing catches the next round"])
      ],
      "7+": [
        S("Warm up", "", ["Run around the circle back to the cone, freezing on command", "Jump around the circle and freeze on command", "Bear crawl around the circle and freeze on command", "Back at the cone: plank for 20 seconds, then wave left arm and right arm. Repeat, raising the legs one at a time."]),
        S("Ice breaker: Jumping game", "First complete body-awareness tasks, e.g. stand on your right leg. Hold hands in a circle. On command, jump in, jump out, jump left or jump right together, until the group is in rhythm. Run in a circle to the right and then to the left so they know left from right."),
        S("Skill game: Freeze coach", "Each student has a ball. Ask: what is this ball, and what shape is it?", ["Coach stands in the middle", "Students bounce-clap-catch while walking towards the coach", "On command, students freeze with the ball in their hand. If they move, they start again.", "Change it by performing: clap catches, then dribbling"])
      ]
    }, finish: "End off with stickers and the B-Active song." },

  R1: { title: "Rugby lesson 01", sport: "Rugby", phase: "Ice breaker", form: "lines3", formText: "Parallel lines (3)", draft: false,
    ages: {
      "4–6": [
        S("Warm up", "Locomotor skills to the middle cone and back: running like a cheetah, froggy jumps, crab walk, bear crawl. Back at the cone: arm circles (forward and backward), windmill stretch (right arm, right foot)."),
        S("Ice breaker: Reaction game", "Place balls on the middle line. Students move to the middle line and stand facing each other. On command, students crab the ball as quickly as they can.", ["Variations: kneeling, standing, back to back, 2 steps away, from far away"]),
        S("Trunk rotations (if there's time)", "Students stand back to back with a ball in one hand. On \"go\", pass the ball to the friend behind by rotating the trunk. Continue to a count of 20."),
        S("Skill game: Fishy Fishy", "Clear the middle line. On \"Fishy Fishy\", students run holding the ball in both hands. On \"Shark\", students run back to their cone. Students do 5 adapted push-ups, then \"Show me your muscles\". On \"Shark\" again, students put the ball under one arm, lunge with the free hand in front and shout \"HAND OFF\".")
      ],
      "7+": [
        S("Warm up", "Locomotor skills to the middle cone and back: running, bum kicks, high knees, bear crawl. Back at the cone: arm circles (forward and backward), windmill stretch (opposite foot to arm)."),
        S("Ice breaker: Reaction game upgraded", "Remove the middle line and make a large square with one ball in the centre. Give each partner a number. On \"Go\", students run round the outside. The coach calls a number, and the two students with that number race to the centre to grab the ball first.", ["Change it up with locomotor skills instead of running: side glides, skipping, jumping"]),
        S("Skill game: Fishy Fishy Tag", "Give a quarter of the class a ball. They are the taggers. Taggers run round and tag their fellow students with the ball. A tagged student takes the ball and starts tagging.", ["Another version: tagged students sit at a designated spot. When all fishies are tagged, a new round of taggers is picked."])
      ]
    }, finish: "End off with stickers and the B-Active song." },

  S1: { title: "Soccer lesson 01", sport: "Soccer", phase: "Ice breaker", form: "squares4", formText: "4 square", draft: false,
    ages: {
      "2–4": [
        S("Warm up: Follow the leader", "Students start in the centre of the four squares. Run to a colour square, then perform the exercise with them:", ["Ninja kicks", "Jumping jacks (feet only)", "Crab pose kicks", "Walking on toes with arms raised"]),
        S("Ice breaker: Body awareness", "Place the mixed-colour cones in a line at one end of the field. On command, call a colour and a body part. Students run to the cone of that colour and touch that body part.", ["Examples: thumbs, knees, chin, big toe", "Make instructions clear. Some students may pick the cones up and bring them back."]),
        S("Skill game: Pirate soccer", "Each student has a ball. Students start by sitting on their ball. Demonstrate, then:", ["Raise each leg for 10 seconds while sitting on the ball", "Place the ball in front of your toes and draw a circle round your feet: one way, then the other way", "Stand up, place one foot on the ball and do toe taps. Count to 10, repeat twice.", "Dribble all around the field", "On command, cover the ball with your body", "If they catch on quickly, the coach comes closer to steal the ball, and students protect it"])
      ]
    }, finish: "End off with stickers and the B-Active song." },

  N2: { title: "Netball lesson 02", sport: "Netball", phase: "Ice breaker", form: "lines2", formText: "Parallel lines (2)", draft: false,
    ages: {
      "2–4": [
        S("Warm up before we race", "", ["Jumping jacks ×10", "Run on the spot in various speeds", "Crab kicks: start by raising your bum off the ground, then kick 10 times", "Adapted push-ups"]),
        S("Races", "Have a series of races that are fun and creative. Race ideas:", ["Normal runs", "Bear crawl", "Bunny hops"]),
        S("Ice breaker: Whistle freeze", "In netball you have to freeze your feet very quickly, so test your ability to freeze on command. Students run from one end of the field to the other. When you blow the whistle, they freeze. Once children are close enough, chase them back to the start. Repeat 2–3 times. Students may still move when asked to stop. That is fine: we want to teach them to start and stop as best they can."),
        S("Skill game: Bowling", "Teach the little ones to bowl the ball. Students stand together on one side. On the other side, place tall cones in a line as targets. Students roll their balls to hit the target. Let them try a few times and keep participation high. If there is time left, work on basic skills and let them explore the ball. Assist each student.")
      ],
      "4–6": [
        S("Warm up before we race", "", ["Jumping jacks ×10", "Run on the spot in various speeds", "Quad stretch"]),
        S("Races", "Have a series of races that are fun and creative. Race ideas:", ["Normal runs", "Spiderman crawls", "Balance cones on head race"]),
        S("Ice breaker: Whistle freeze", "Students run from one end of the field to the other. When you blow the whistle, they freeze. Once children are close enough, chase them back to the start. Repeat 2–3 times. Add variations: when you blow the whistle, students perform an action.", ["Lay flat on the floor", "Curl into a ball", "Jump high and land feet together"]),
        S("Skill game: Pass the parcel", "Each line is a team. The first person in each line gets a ball. Teams pass the ball from the start to the end. The first team to get their ball to the end wins. Take your time when explaining.", ["Variation: pass the ball to the end of the line and then back again", "Variation: bounce pass"])
      ],
      "7+": [
        S("Warm up before we race", "", ["Jumping jacks ×10", "Run on the spot in various speeds", "Tuck jumps", "Quad stretch"]),
        S("Races", "Have a series of races that are fun and creative. Race ideas:", ["Normal runs", "Spiderman crawls", "1-leg races", "Balance cones on head race"]),
        S("Ice breaker: Whistle freeze", "Students run from one end to the other. When you blow the whistle, they freeze. Chase them back to the start once they are close. Repeat 2–3 times. Add variations when you blow the whistle:", ["Go into a plank", "Curl into a ball", "Jump high into a squat"]),
        S("Skill game: Pass the parcel", "Each line is a team with a ball. Teams pass the ball from start to end. The first team to finish wins. With this age, make it clear that students pass the ball and do not hand it over.", ["Variation: pass to the end of the line and back again", "Variation: bounce pass"])
      ]
    }, finish: "End off with stickers and the B-Active song." },

  // ---- DRAFTS: not yet checked ----
  R2: { title: "Rugby lesson 02", sport: "Rugby", phase: "Ice breaker", form: "lines3", formText: "Parallel lines (3)", draft: true,
    ages: {
      "2–4": [S("Warm up", "Animal walks to the middle cone and back: bear crawl, crab walk, bunny hops."), S("Ice breaker: Statues", "Students run freely. On \"Statue\", they freeze. Repeat, changing the animal."), S("Skill game: Roll and receive", "In lines of three, roll the ball to the person beside you, then run to the back of the line.")],
      "4–6": [S("Warm up", "Animal walks to the middle cone and back, with arm circles at the cone."), S("Ice breaker: Tag the tail", "Each student tucks a bean bag in their waistband. On command, students try to take a tail from another student while protecting their own."), S("Skill game: Pass backwards", "In lines of three, students pass the ball backwards along the line, then run to the back. Count how many passes the team makes in 30 seconds.")],
      "7+": [S("Warm up", "Locomotor skills to the middle cone and back: running, high knees, side shuffle."), S("Ice breaker: Tails", "Take a tail from a partner while protecting your own. Change partners on each whistle."), S("Skill game: Pass and run", "Three-player lines run the length of the field passing the ball backwards, then place the ball on the ground at the end line.")]
    }, finish: "End off with stickers and the B-Active song." },

  S2: { title: "Soccer lesson 02", sport: "Soccer", phase: "Ice breaker", form: "lines2", formText: "Dribble lanes (2)", draft: true,
    ages: {
      "2–4": [S("Warm up", "Jog between the lines. Follow the coach: high knees, side shuffle, walk on toes."), S("Ice breaker: Stop the ball", "Each student dribbles. On command, they stop the ball with the sole of the foot."), S("Skill game: Traffic lights", "Green: dribble. Yellow: slow down. Red: stop the ball with a foot on top.")],
      "4–6": [S("Warm up", "Jog, high knees, side shuffle along the lanes."), S("Ice breaker: Freeze dribble", "Dribble freely. On command, freeze with a foot on the ball. Change direction on the next command."), S("Skill game: Slalom dribble", "Dribble through cones using the inside and outside of each foot.", ["Variation: dribble with the other foot only"])],
      "7+": [S("Warm up", "Jog, skip and side shuffle along the lanes."), S("Ice breaker: Stop and go", "On command, stop the ball with the sole and go again on the next command."), S("Skill game: Dribble race", "Two lanes race. Dribble through the cones, turn at the end line and return to the start.", ["Variation: dribble with the outside of the foot only"])]
    }, finish: "End off with stickers and the B-Active song." },

  N3: { title: "Netball lesson 03", sport: "Netball", phase: "Phase 1: basic skills", form: "lines2", formText: "Parallel lines (2)", draft: true,
    ages: {
      "2–4": [S("Warm up", "Skip, side shuffle and sprint to the cone."), S("Ice breaker: Stop and go", "Run on the whistle. Freeze on the second whistle."), S("Skill game: Pass to a partner", "Students stand in pairs across the two lines. Pass the ball to a partner with both hands and catch it.")],
      "4–6": [S("Warm up", "Skip, side shuffle, sprint to the cone and back."), S("Skill game: Chest pass chain", "Pairs pass across the two lines, counting the passes.", ["Variation: step in with the pass"])],
      "7+": [S("Warm up", "Skip, side shuffle, sprint to the cone and back, with a high-knees sprint."), S("Skill game: Netball chain", "Pass around the line. Count the passes in one minute and try to beat the score.", ["Variation: move the feet after the catch"])]
    }, finish: "End off with stickers and the B-Active song." },

  R3: { title: "Rugby lesson 03", sport: "Rugby", phase: "Phase 1: basic skills", form: "circle", formText: "Circle", draft: true,
    ages: {
      "2–4": [S("Warm up", "Follow the leader in the circle."), S("Ice breaker: Stay in your lane", "Run inside the circle and do not cross the lines."), S("Skill game: Touch down", "Carry the ball to the line and place it down.")],
      "4–6": [S("Warm up", "Follow the leader in the circle, with tuck jumps."), S("Ice breaker: Stay in your lane", "Students run in lanes and follow the coach."), S("Skill game: Give and go", "Pass to a friend running beside you, then keep running.")],
      "7+": [S("Warm up", "Running, high knees, bum kicks round the circle."), S("Ice breaker: Stay in your lane", "Students run in lanes and change direction on each whistle."), S("Skill game: Give and go", "Pass to a friend running alongside, then take the ball back in a support run.", ["Variation: pass backwards only"])]
    }, finish: "End off with stickers and the B-Active song." },

  S3: { title: "Soccer lesson 03", sport: "Soccer", phase: "Phase 2: partner work", form: "squares4", formText: "4 square", draft: true,
    ages: {
      "2–4": [S("Warm up", "Follow the leader round the square."), S("Ice breaker: Sharks and fish", "Students run in the square. On \"shark\", they freeze."), S("Skill game: Pass in the square", "Four students in a square pass the ball to each other with the inside of the foot.")],
      "4–6": [S("Warm up", "Jog and move round the square."), S("Ice breaker: Sharks and fish", "Students dribble in the square. On \"shark\", they stop the ball."), S("Skill game: Rondo", "Four students pass in a small square. One student in the middle tries to win the ball.")],
      "7+": [S("Warm up", "Jog, skip and change direction in the square."), S("Ice breaker: Ball control", "Students dribble and change direction on each whistle."), S("Skill game: Rondo", "Three students pass, one defender tries to win the ball. Rotate every minute.", ["Variation: pass with the outside of the foot"])]
    }, finish: "End off with stickers and the B-Active song." }
};

