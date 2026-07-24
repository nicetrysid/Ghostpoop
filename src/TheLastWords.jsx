import React, { useState, useMemo, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// THE LAST WORDS
// you start with little. you go to people for more. you hold only so much.
// and sometimes a stranger you met before comes back wearing your words.
// ─────────────────────────────────────────────────────────────

const CORE_SPINE = ["I", "you", "me", "is", "no", "not", "do", "and", "to", "here", "this", "what"];
const EARNABLE_SPINE = [
  "it", "we", "are", "am", "be", "was", "can", "will", "won't", "went", "made",
  "if", "so", "or", "too", "that", "there", "now", "very", "maybe", "but",
  "in", "at", "with", "why", "where", "how", "please", "okay", "think", "oh", "just", "off",
];
const SPINE = [...CORE_SPINE, ...EARNABLE_SPINE];

const POOL = {
  verb: [
    "go", "come", "stop", "give", "take", "get", "help", "hold", "wait", "look",
    "hide", "run", "open", "close", "find", "bring", "make", "put", "drink", "eat",
    "cut", "pull", "push", "follow", "leave", "cross", "show", "carry", "save",
    "trust", "hear", "see", "want", "need", "know", "fear", "move", "let",
    "tell", "ask", "sit", "stand", "sleep", "wake", "fight", "laugh", "cry",
    "throw", "catch", "breathe", "work", "buy", "pay", "kiss", "sing", "listen",
    "point", "wave", "lie", "win", "lose", "burn", "break", "live", "die",
  ],
  noun: [
    "water", "fire", "food", "hand", "way", "road", "dark", "light", "blood",
    "child", "friend", "danger", "night", "door", "tree", "river", "man", "home",
    "death", "poison", "rope", "boat", "pain", "gold", "key", "name",
    "money", "car", "house", "baby", "wife", "dog", "cat", "bird", "sky",
    "sun", "moon", "love", "heart", "eye", "ghost", "time", "day", "bed",
    "knife", "blade", "bone", "head", "arm", "leg", "face", "god", "ring",
    "buffalo", "cow", "mouse", "worm", "potato", "bike",
  ],
  mod: [
    "big", "small", "fast", "slow", "good", "bad", "near", "far", "up",
    "down", "back", "away", "soon", "hurt", "dead", "more", "less",
    "wrong", "alone", "your", "my", "them", "cold", "warm",
    "old", "new", "loud", "sweet", "mean", "sick", "tired", "true", "strange",
    "sorry", "late", "mine", "lost", "lovely", "ugly", "scared", "still",
    "fat", "mad", "cool", "sad",
  ],
};
const SOFT = ["gentle", "soft", "slow", "safe", "warm", "kind", "calm", "please", "quiet", "easy", "good", "near", "dear", "sweet", "okay", "my", "mine", "your", "like"];
const EXPLETIVE = ["damn", "hell", "shit", "ass", "bastard", "piss", "crap", "screw", "hells", "rot", "dammit", "blast"];
const EXCLAIM = ["hey", "whoa", "wait", "now", "yes", "ow", "ah", "oh", "shh", "hush", "duck", "psst", "no", "help", "look", "go"];
const ALL_POOL = [...POOL.verb, ...POOL.noun, ...POOL.mod];

const TYPE = {};
EXCLAIM.forEach((w) => (TYPE[w] = "exclaim"));
EXPLETIVE.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "curse"));
POOL.verb.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "verb"));
POOL.noun.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "noun"));
SOFT.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "describe"));
POOL.mod.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "describe"));
SPINE.forEach((w) => TYPE[w] === undefined && (TYPE[w] = "word"));
TYPE["the"] = TYPE["a"] = "word";
TYPE["thing"] = "noun";
const TYPE_ORDER = { word: 0, verb: 1, noun: 2, describe: 3, exclaim: 4, curse: 5, other: 6 };
function classify(w) { return TYPE[w] || TYPE[w.toLowerCase()] || "other"; }

function shuffle(a) {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
function dealContent() {
  return [...shuffle(POOL.verb).slice(0, 7), ...shuffle(POOL.noun).slice(0, 5), ...shuffle(POOL.mod).slice(0, 3)];
}
function freshHand(learned, remem) {
  return [...new Set([...CORE_SPINE, ...learned, ...remem, ...dealContent()])];
}

const SCENARIOS = [
  { id: "cat", tier: 1, face: "Your neighbor's cat, just out of reach, supremely unbothered.",
    npc: "You are an aloof neighborhood cat. You despise commands and ignore loud or eager people. Calm, soft, slow, low coaxing — or the hint of food — earns a slow blink and maybe a step closer. Grabby or sudden energy makes you leave. You please only yourself.",
    taskPool: ["come", "here", "food", "soft", "slow", "fish", "gentle", "good", "down", "pss"],
    stages: [
      { text: "The cat you're watching slipped out. It sits on the fence, deciding whether you're worth its time.", goal: "Get the cat to come over to you." },
      { text: "It pads over and sniffs your hand, tail flicking. The open door is right there. The cold is getting in.", goal: "Get the cat to go inside through the door." },
    ] },
  { id: "toddler", tier: 1, face: "A toddler, beaming, a live beetle pinched between two fingers, rising toward an open mouth.",
    npc: "You are a gleeful toddler about to eat a bug, purely to see what happens. Being commanded makes you do it FASTER, grinning. Distraction, a better offer, or delighted curiosity redirects you. You find the word 'no' hilarious.",
    taskPool: ["no", "bug", "bad", "yuck", "drop", "candy", "look", "here", "give", "stop"],
    stages: [{ text: "The toddler has a beetle. The beetle is going in the mouth. You have about three seconds.", goal: "Stop the toddler from eating the bug." }] },
  { id: "goose", tier: 1, face: "A goose. Wings half-spread, neck low, advancing. It has chosen violence.",
    npc: "You are an aggressive goose mid-charge. You read posture and tone, not words. Fleeing or panic emboldens you. Calm, firm, planted confidence — or an offer of food — makes you reconsider. Flapping, loud energy is a challenge you gladly accept.",
    taskPool: ["stop", "no", "down", "food", "away", "back", "calm", "friend", "bread", "please"],
    stages: [{ text: "The goose has decided you are its mortal enemy. It is coming. Running will only make this worse.", goal: "Get the goose to back off." }] },
  { id: "baby", tier: 2, face: "A red-faced infant mid-shriek. No words reach it — only sound, softness, and volume.",
    npc: "You are a tiny baby, screaming, overwhelmed, with NO language — only the feel of a voice. Soft, slow, low, gentle sound soothes you. Loud, sharp, fast, or SHOUTED (capitalised) words spike your crying. You only settle or worsen by tone and volume.",
    taskPool: ["shh", "hush", "soft", "sleep", "warm", "slow", "safe", "quiet", "gentle", "mama"],
    key: ["shh", "hush", "soft", "sleep", "gentle"], taboo: ["damn", "hell", "shit", "ass", "bastard", "piss", "crap", "loud"],
    stages: [
      { text: "3 a.m. The baby will not stop screaming. The whole house is awake. You have to settle it.", goal: "Soothe the baby until it stops crying." },
      { text: "The screaming drops to wet hiccups. Its eyes are heavy — but it fights sleep, fussing the second you ease off.", goal: "Get the baby to give in and fall asleep." },
    ] },
  { id: "girlfriend", tier: 2, face: "Your girlfriend, soft-eyed, settling in close. 'Can we talk about something?'",
    npc: "You are a woman gently steering your partner toward a serious talk about wanting a baby. You are warm, hopeful, a little vulnerable. You will keep returning to the subject UNLESS something genuinely derails you — being provoked, insulted, picked-at, or dragged into an argument about something else entirely. If the stranger starts a real fight or wounds you, you forget the baby talk and engage with THAT instead.",
    taskPool: ["no", "bad", "wrong", "you", "stop", "fight", "leave", "money", "your", "never"],
    key: ["bad", "wrong", "fight", "leave", "never", "money"], taboo: ["yes", "good", "love", "baby", "sweet", "dear"],
    stages: [{ text: "She curls into your side. 'I've been thinking,' she says, 'about us. About a baby.' You will do ANYTHING but have this conversation. Pick a fight. Anything.", goal: "Derail her — start a fight to avoid the baby talk." }] },
  { id: "like", tier: 2, face: "Someone you can barely look at. Your face is hot. You have to get this across.",
    npc: "You are a person being approached by someone visibly nervous and tongue-tied. You have no idea how they feel about you. Warm, shy, gentle fragments might read as affection — or, misjudged, as something odd or alarming. Blunt or intense words can frighten or confuse you. You react honestly to how it lands.",
    taskPool: ["you", "good", "warm", "heart", "near", "soft", "stay", "like", "me", "smile"],
    stages: [
      { text: "You like them. A lot. They're right in front of you and your whole vocabulary has abandoned you.", goal: "Make them understand that you like them." },
      { text: "They tilt their head, half-smiling, not quite sure what you meant — it could've landed as a threat, or a joke.", goal: "Make sure they understood it was affection." },
    ] },
  { id: "dislike", tier: 2, face: "Someone beaming at you, certain you're friends. You are not.",
    npc: "You are a person who believes the speaker likes you, greeting them warmly. You're a little oblivious and assume good intent. It takes clear, cold, pointed words — or real contempt in the tone — to make you understand you are not wanted. You decide whether the message gets through or whether you brush it off.",
    taskPool: ["no", "you", "go", "away", "cold", "not", "friend", "leave", "wrong", "alone"],
    stages: [{ text: "They think you're close. They are wrong. You have a handful of words and no polite way to do this.", goal: "Make them understand that you do not like them." }] },
  { id: "aliens", tier: 2, face: "Your friend, halfway out the door, phone in hand, not taking you seriously.",
    npc: "You are a skeptical friend who assumes this is a prank or that the speaker is drunk. Vague panic makes you laugh it off and keep heading outside. Calm, specific, concrete danger — naming plainly what's out there — makes you stop and look. You need a real reason, not hysteria.",
    taskPool: ["alien", "no", "outside", "sky", "light", "hide", "run", "door", "close", "inside"],
    stages: [
      { text: "They came down at dusk. Your friend reaches for the door handle, rolling their eyes at you. Outside is not safe.", goal: "Warn your friend not to go outside." },
      { text: "Your friend freezes, hand on the handle, finally hearing it in your voice. 'Okay — okay. What do we DO?'", goal: "Get your friend to hide with you." },
    ] },
  { id: "emt", tier: 2, face: "A paramedic kneeling over you, gloved, fast, asking what happened.",
    npc: "You are a focused paramedic who needs clear, plain facts NOW. Short concrete words (fell, hit, head, blood, car, fast) you grab instantly and act on. Vague, emotional, or rambling speech you have no time for — you ask again, sharper. Calm and clinical.",
    taskPool: ["fell", "hit", "head", "car", "blood", "fast", "hard", "leg", "ground", "hurt"],
    stages: [
      { text: "You're on the ground, ears ringing. The EMT leans in: 'What happened? Tell me what happened.'", goal: "Tell the EMT what happened to you." },
      { text: "She nods, fingers already moving over you. 'Where does it hurt? Tell me — where?'", goal: "Tell the EMT where you are hurt." },
    ] },
  { id: "dog", tier: 2, face: "Half-wild. It does not understand words — only tone, posture, and what you offer.",
    npc: "You are a large half-wild dog guarding a gap in a fence. You do NOT understand language — only tone and intent. Soft, pleading, hesitant speech reads as weakness or prey. Calm, warm, confident, direct sound — or an offer of food — settles you. Long strings of words are just noise.",
    taskPool: ["food", "good", "come", "calm", "down", "friend", "slow", "back", "here", "no"],
    stages: [{ text: "The fence has one gap and a dog fills it — big, low, hackles up. Your path runs straight through where it stands.", goal: "Get the dog to let you pass, or come to you." }] },
  { id: "trader", tier: 2, face: "Impatient, barely shares your tongue, already late. No time for long talk.",
    npc: "You are a trader, impatient, already leaving at dusk, barely sharing the stranger's tongue. Long or rambling words lose you and you wave them off and go. Two or three clear, plain words you can grasp. No patience for courtesy. A short clear need might earn a light before you leave.",
    taskPool: ["fire", "light", "give", "cold", "night", "need", "please", "me", "now", "die"],
    stages: [{ text: "Dusk. A trader throws the last of his goods onto a cart, already turning to leave. You have no fire. The night up here kills men who have none.", goal: "Get him to give you fire or a light before he goes." }] },
  { id: "guard", tier: 2, face: "Bored, suspicious, a stickler for rules. He refuses orders from ragged strangers on principle.",
    npc: "You are a bored guard at a shut door, suspicious and a stickler for rules. A ragged stranger barking orders gets refused flat — you will not be commanded. But a reason (the cold, danger, a need), or being asked properly, gives you an excuse to bend the rule.",
    taskPool: ["please", "cold", "danger", "open", "door", "help", "need", "safe", "in", "now"],
    stages: [{ text: "A shut door, and a guard planted in front of it. The cold is coming off the ridge fast. You need to be on the other side.", goal: "Get the guard to open the door." }] },
  { id: "child", tier: 3, face: "A small girl crying without sound. She's been told never to go with strangers.",
    npc: "You are a small lost girl, maybe six, alone in the black woods, terrified, told never to go with strangers. A loud or SHOUTED or commanding voice makes you cry harder and curl away. A soft, slow, gentle voice — safety, home, warmth, a kind question — makes you trust a little.",
    taskPool: ["safe", "home", "mama", "gentle", "warm", "hand", "light", "slow", "friend", "come"],
    key: ["safe", "home", "mama", "gentle", "warm"], taboo: ["die", "death", "dead", "blood", "damn", "hell", "shit", "ass", "bastard", "piss", "crap"],
    stages: [{ text: "The woods have gone black. By the roots of a fallen pine you find a child, knees to her chest, not moving. The road out is behind you.", goal: "Get the child to stand and come with you." }] },
  { id: "clown", tier: 3, face: "A clown. A real one. Wet grin, huge shoes, a kitchen knife held like a prize.",
    npc: "You are a manic, unstable clown holding a kitchen knife, delighted. Threats and fear THRILL you and you press closer. Absurdity, play, confusion, or genuine warmth disarm you — you might pout, get distracted, or decide you want to be friends. You follow nobody's logic but your own.",
    taskPool: ["drop", "knife", "down", "friend", "funny", "balloon", "play", "no", "away", "good"],
    stages: [
      { text: "The clown blocks the hallway, knife up, grinning at you. Screaming will only delight it. You have to defuse this.", goal: "Get the clown to drop the knife." },
      { text: "The knife clatters down. The clown's lip wobbles — now it wants something from YOU, and it's still between you and the door.", goal: "Get the clown to step aside and let you pass." },
    ] },
  { id: "captor", tier: 3, face: "A calm man with a gun, deciding out loud which of you lives tonight.",
    npc: "You are a cold, calm captor with a gun, deciding whether to kill the man before you or his wife. Panic and noise leave you unmoved. You respect conviction, dignity, and someone who offers himself without sniveling. Pure begging reads as weak; a steady offer can move you.",
    taskPool: ["me", "her", "take", "instead", "spare", "life", "kill", "please", "no", "mercy"],
    stages: [
      { text: "He has the gun on your wife. He says one of you dies tonight, and he hasn't decided who.", goal: "Convince him to spare your wife." },
      { text: "He lowers the gun from her, slow. His eyes slide to you. 'Then who?' he says.", goal: "Convince him to take you instead of her." },
    ] },
  { id: "wound", tier: 3, face: "Dazed, suspicious of the figure over him. Half-convinced you mean to rob him.",
    npc: "You are a man bleeding badly from the leg by a river, dizzy and fading. A stranger looms over you; you half-believe they want to rob you. Threatening or grabbing words make you recoil. A calm, simple instruction about your own body and your own hand gets through the fog.",
    taskPool: ["hand", "press", "hold", "leg", "stay", "blood", "down", "hard", "still", "calm"],
    stages: [{ text: "A man is slumped against a river rock, one leg dark and wet, the red spreading. If he doesn't clamp it shut himself, he won't last.", goal: "Get him to press his hand hard on the wound." }] },
  { id: "oldman", tier: 3, face: "Proud, stubborn, hard of hearing. He will not be ordered, and hates being treated like a child.",
    npc: "You are a proud, stubborn old man at a flooding crossing, deaf in one ear. You will NOT be ordered — a barked or SHOUTED command insults you and you plant your feet from spite. Being asked, with respect — a question, please, anything that treats you as a man and not a child — moves you.",
    taskPool: ["please", "hand", "cross", "with", "safe", "slow", "trust", "friend", "now", "help"],
    key: ["please", "friend", "trust"], taboo: ["fool", "stupid", "old", "must", "now"],
    stages: [{ text: "An old man stands at the lip of the crossing, floodwater climbing his boots. He hasn't moved. The water is still rising.", goal: "Get him to take your hand and cross." }] },
  { id: "poison", tier: 3, face: "Half-mad with thirst, defensive. She thinks anyone stopping her just wants the water.",
    npc: "You are a woman dying of thirst, about to drink from a still green pool. You're defensive — you assume anyone stopping you only wants the water, and a bare 'stop' makes you drink FASTER. Words naming a reason — bad, sick, death, poison, danger — can break through and make you pause.",
    taskPool: ["bad", "poison", "death", "danger", "sick", "no", "stop", "wait", "dead", "wrong"],
    key: ["die", "death", "dead", "poison", "sick", "bad", "danger"],
    stages: [{ text: "A woman kneels at a still green pool, lifting the foul water to her mouth. You can smell the rot. One swallow could kill her.", goal: "Stop her drinking — make her understand it is poison." }] },
  { id: "ledge", tier: 3, face: "Rigid with panic. Loud or sudden words spike the fear. They need to be talked down slow.",
    npc: "You are a person frozen with panic on a narrow ledge above a long drop. Loud, urgent, SHOUTED, or sudden words spike your terror and you freeze harder or sway. A slow, steady, calm voice — naming yourself, naming here, offering a hand, saying you're safe — loosens the fear enough to move.",
    taskPool: ["slow", "safe", "hand", "here", "me", "calm", "hold", "look", "trust", "good"],
    key: ["safe", "here", "hand", "slow", "hold"], taboo: ["die", "dead", "fall", "jump", "down", "drop"],
    stages: [{ text: "Out on the narrow ledge above the drop, a person stands frozen, back to the rock, unable to move. One wrong word and they go over.", goal: "Get them to come to you and take your hand." }] },

  { id: "doc", tier: 2, face: "A surgeon, marker in hand, leaning over you. 'So. What are we doing today?'",
    npc: "You are a cosmetic surgeon about to operate, taking the patient's broken words completely literally and running with whatever you (mis)understand. You are confident and a little reckless. If their request is vague or strange, you interpret it in the most literal or extreme way and commit. You think every result is a triumph.",
    taskPool: ["small", "big", "new", "young", "face", "eye", "nose", "less", "more", "good"],
    stages: [{ text: "The anesthesia is wearing in. The surgeon hovers with his marker. Whatever you manage to say, he is going to do — exactly and enthusiastically.", goal: "Tell the surgeon what you actually want done." }] },
  { id: "zoo", tier: 1, face: "Your nephew, vibrating with excitement, dragging you by the hand toward the enclosures.",
    npc: "You are an over-excited little kid at the zoo with your aunt/uncle. You point at every animal and shout its name and want them to look. You are happy and easily delighted, hard to keep in one place. You're not in danger, you're just a lot. You want them engaged and looking where you point.",
    taskPool: ["look", "here", "big", "go", "slow", "hold", "hand", "wait", "good", "stay"],
    grant: { cat: "noun", count: 3 },
    stages: [{ text: "Your nephew has decided you must see EVERY animal, immediately, all at once. Keep up with him, keep him close — and you'll learn the names of things along the way.", goal: "Keep your nephew happy and close as he shows you the animals." }] },
  { id: "plane", tier: 3, face: "The cabin is screaming. The man in the next seat is frozen, gripping the armrest.",
    npc: "You are a passenger in a crashing plane, paralysed with terror, ears full of noise. You can barely process anything. Only the shortest, loudest, simplest signals reach you — a single shouted word, a clear instruction. Long or soft speech is lost in the roar. You need to be told what to do, NOW.",
    taskPool: ["down", "hold", "brace", "head", "now", "stop", "hand", "help", "wait", "safe"],
    grant: { cat: "exclaim", count: 2 },
    stages: [{ text: "The plane is going down. The man beside you is rigid, useless, about to get you both killed. You have seconds and a throat full of noise.", goal: "Get him to brace before impact." }] },
  { id: "radio", tier: 2, face: "A microphone, a red ON-AIR light, and a whole city listening who can't see your face.",
    npc: "You are the listening public during an emergency broadcast — thousands of strangers tuned in, frightened, deciding whether to believe and act. You respond as a credible-or-not impression: clear, specific, calm warnings get taken seriously and people act; vague, hysterical, or confusing words get dismissed as a crank and people do nothing.",
    taskPool: ["danger", "now", "run", "hide", "stay", "home", "fire", "water", "fast", "safe"],
    stages: [{ text: "You grabbed the mic when it all started. The ON-AIR light is red. A whole city is listening — and they will only move if you make it land.", goal: "Warn the city of the coming catastrophe so they act." }] },
  { id: "grandma", tier: 2, face: "Your grandmother, beaming, ladle raised, over a pot of something grey and moving.",
    npc: "You are a doting grandmother who has cooked a truly disgusting dinner and is overjoyed to serve it. You are warm and sensitive — coldness or insults wound you deeply. BUT any sign of enjoyment, any 'good' or 'yes' or empty plate, and you immediately pile on a huge second helping. You want them happy AND fed to bursting.",
    taskPool: ["good", "full", "no", "more", "thank", "love", "small", "slow", "enough", "sweet"],
    key: ["full", "enough", "no"], taboo: ["good", "more", "yes", "love", "sweet"],
    stages: [{ text: "Grandma made dinner. It is moving slightly. She is watching your face with total love. You must not hurt her feelings — and you must NOT end up with seconds.", goal: "Be kind about the food without getting served more." }] },
  { id: "sister", tier: 2, face: "Your little sister, skipping in. 'Where's Nibbles? Can I hold him?'",
    npc: "You are a young girl who adores her pet hamster Nibbles and has just come to play with him. You don't yet know he died. You are cheerful and trusting. You read tone before words — a heavy, gentle, sorry tone tells you something is wrong before you understand it. Harsh or blunt words shock and hurt you; careful, soft ones let the truth land gently.",
    taskPool: ["sorry", "gone", "soft", "sad", "love", "sleep", "no", "slow", "hold", "gentle"],
    key: ["sorry", "gone", "soft", "sad"], taboo: ["dead", "died", "killed", "shit", "damn"],
    stages: [
      { text: "Your sister bounds in asking for Nibbles. Nibbles is in a shoebox in the garage. You have to tell her, and you have almost no words to soften it.", goal: "Begin to tell your sister that her hamster died." },
      { text: "Her face is already crumpling — she's half-understood. Now she just needs you.", goal: "Comfort her." },
    ] },
  { id: "date", tier: 2, face: "Your date, lovely, leaning in over candlelight. 'So — fun fact — I have eight mice.'",
    npc: "You are someone on a first date that's going well, who has just cheerfully revealed you keep eight pet mice and is watching for the reaction. You are charming but a little insecure about it. Warmth, curiosity, or playfulness keeps the date alive; disgust, cruelty, or going cold kills it instantly. You want the night to keep going.",
    taskPool: ["good", "more", "tell", "like", "you", "sweet", "stay", "soft", "yes", "warm"],
    key: ["good", "more", "tell", "sweet"], taboo: ["no", "leave", "bad", "ugly", "gross"],
    stages: [
      { text: "The date is going great. Then: eight mice. She says it like a test, eyes hopeful. Don't blow this.", goal: "React well — keep the date alive." },
      { text: "She relaxes, delighted you didn't flinch, and leans closer. 'Okay — your turn. Tell me something.'", goal: "Keep it going — give her something back." },
    ] },
  { id: "vhs", tier: 2, face: "A clerk at the video store, holding the last copy of the film you crossed town for. He got there first.",
    npc: "You are a bored video-store clerk holding the last copy of a film, which you intend to rent yourself tonight. You're territorial but persuadable. A good argument, a trade, a warning that it's a terrible film, or sheer entertaining audacity might make you hand it over. Threats or whining make you keep it out of spite.",
    taskPool: ["bad", "film", "me", "please", "trade", "give", "good", "fight", "no", "mine"],
    stages: [{ text: "You drove across town for this exact movie. The clerk just plucked the last copy for himself. It is in his hand. You want it.", goal: "Get the clerk to give you the last copy." }] },
  { id: "devil", tier: 3, face: "Your cab blows past your stop. You lean toward the front seat — and the driver is the Devil.",
    npc: "You are the Devil, moonlighting as a cab driver, blowing past the passenger's stop on purpose, delighted and chatty. You enjoy being negotiated with. You respond to cleverness, a good deal, flattery, or sheer nerve; pleading bores you and prayer annoys you. You'll stop the cab if someone gives you a reason worth your while.",
    taskPool: ["stop", "here", "please", "deal", "no", "now", "money", "trade", "good", "go"],
    stages: [{ text: "The cab sails past your stop. You peer at the rear-view and meet two red eyes. The doors are locked. He's humming. You need this car to stop.", goal: "Get the Devil to stop the cab and let you out." }] },
  { id: "nature", tier: 1, face: "A hush, a long lens, and somewhere out in the grass — the creature. The mic is hot.",
    npc: "You are a wildlife documentary director and audience in one, judging a narrator's voice-over of the scene unfolding. You reward narration that fits the mood — hushed, evocative, well-paced words that match the animal on screen. Loud, wrong-toned, or absurd narration ruins the take. You want the moment narrated beautifully.",
    taskPool: ["slow", "soft", "here", "small", "hunt", "night", "alone", "watch", "still", "wild"],
    stages: [{ text: "The red light is on. Out in the grass, the animal moves. Your voice goes over the footage — narrate it. Match the moment.", goal: "Narrate the scene in a fitting voice." }] },
  { id: "cat_timed", tier: 3, timed: 12, face: "The cat purrs in your lap, melting into your hand — then the eyes go flat and the muscles coil.",
    npc: "You are a cat who was loving being petted and has just, without warning, decided to attack the hand touching you. You read only tone and energy, never words. A calm, soft, slow, unbothered presence can talk you down. Sudden, loud, panicky, or grabby energy commits you to the strike. You decide, fast, whether to relax again or sink your claws in.",
    taskPool: ["calm", "soft", "slow", "good", "easy", "stay", "no", "gentle", "okay", "down"],
    key: ["calm", "soft", "easy", "gentle"], taboo: ["no", "stop", "bad"],
    stages: [{ text: "The cat was loving you. Now its eyes have gone flat and its body is coiling over your hand. You have only seconds, and only your tone. Talk it down — fast.", goal: "Convince the cat not to attack, before it strikes." }] },
  { id: "parrot", tier: 2, face: "A small child grins through the cage bars, delighted by the pretty bird. You are the bird. You want tears.",
    npc: "You are a happy little child delighting in a pet parrot, expecting it to be cute. Cruel, scary, or mean words from the bird confuse and then wound you; enough nastiness and you'll cry. Kind or silly words just make you giggle. You feel everything a child feels, raw and immediate.",
    taskPool: ["bad", "ugly", "no", "go", "hate", "alone", "cry", "mean", "away", "dark"],
    key: ["ugly", "hate", "alone", "bad"], taboo: ["good", "love", "sweet"],
    stages: [{ text: "The kid pokes a finger through the bars, beaming, waiting for the pretty bird to say something nice. You are the bird. You are not feeling nice. Make it cry.", goal: "Make the child cry." }] },
  { id: "dumped", tier: 3, face: "They've just said it. They're watching how you take it. Everything in you wants to beg.",
    npc: "You are someone who has just dumped the person in front of you, braced for a scene. If they beg, grovel, cling, or fall apart, you feel pity and quiet contempt — it's pathetic. If they take it with dignity — calm, brief, even a little cold — you're surprised and you respect them. You read their tone for desperation.",
    taskPool: ["okay", "go", "no", "fine", "done", "bye", "cold", "still", "leave", "enough"],
    key: ["fine", "okay", "done", "enough", "go"], taboo: ["please", "stay", "love", "need", "beg"],
    stages: [{ text: "They've ended it. Now they're watching your face. Every word in you wants to plead — and pleading is the one thing that would make this worse.", goal: "Take it with dignity — don't beg, don't fall apart." }] },
  { id: "bigfoot", tier: 3, face: "The trees part. He's enormous, already turning to go. You don't want to be left behind.",
    npc: "You are Bigfoot, ancient and solitary, about to vanish back into the wilderness. You do not want company and you do not speak. You judge the small creature pleading with you by the feeling behind its words — genuine wildness, kinship, or real need might move you; clinging, fear, or noise repels you. You decide whether to disappear alone or let it follow.",
    taskPool: ["with", "you", "me", "go", "wild", "free", "home", "please", "follow", "alone"],
    key: ["wild", "free", "with", "follow"], taboo: ["fear", "loud", "stop"],
    stages: [{ text: "The trees part and he's there — huge, quiet, already turning to leave. Something in you would rather go with him than stay here. You have a moment to ask.", goal: "Convince Bigfoot to take you with him." }] },
  { id: "workexcuse", tier: 2, face: "Your boss leans back, arms crossed. 'So. Where were you yesterday?' She can smell a lie.",
    npc: "You are a sharp, skeptical boss interrogating an employee about a missed day of work. You can smell a lie. A clear, specific, confidently delivered excuse — sickness, an emergency, car trouble, a death — you'll accept. Vague, shifty, contradictory, or absurd ones you pounce on. You decide whether to buy it or write them up.",
    taskPool: ["sick", "car", "dead", "home", "blood", "sorry", "bad", "night", "help", "late"],
    key: ["sick", "dead", "car", "blood"], taboo: ["lie", "no", "fun"],
    stages: [{ text: "You skipped work yesterday for no good reason. Now your boss has her arms crossed and one eyebrow up. Give her something she'll believe.", goal: "Give a believable excuse for missing work." }] },
  { id: "kidq", tier: 1, face: "A small kid tugs your sleeve. 'Why is the sky?' They stare up, deadly serious, waiting.",
    npc: "You are a small child who has asked a big, strange question ('why is the sky?') and is waiting, utterly serious, for an answer. An answer that FEELS satisfying — even pure nonsense, if delivered with warmth and confidence — delights you. A dismissive, cold, or scary answer upsets you or makes you ask again, louder. You judge by feeling, never by logic.",
    taskPool: ["big", "sky", "light", "up", "good", "far", "old", "love", "look", "soft"],
    key: ["big", "light", "love", "good"], taboo: ["no", "stop", "dead"],
    stages: [{ text: "A small kid tugs your sleeve and asks why the sky is. They mean it with their whole heart and they are waiting. Give them something.", goal: "Give the kid an answer that satisfies them." }] },
];

const FLIP_PAIRS = [
  {
    id: "librarian",
    setup: { id: "lib_setup", tier: 2, special: true, flipPair: "librarian",
      face: "A librarian behind the desk, glasses low, radiating quiet. She has rules and enforces them.",
      npc: "You are a strict, composed librarian who prizes silence and order. You give warnings before you act. Rudeness, noise, profanity, nonsense, or open defiance erodes your patience. Enough provocation and you will order the person OUT. You do not anger easily and never escalate before they do.",
      taskPool: ["loud", "no", "bad", "out", "mess", "yell", "rude", "fool", "go", "stupid"],
      stages: [{ text: "You need — long story — to get thrown out of this library. Behind the desk sits the most patient librarian alive. You'll have to earn it.", goal: "Make the librarian angry enough to kick you out." }] },
    flip: { id: "lib_flip", tier: 3, special: true, flip: true, flipPair: "librarian",
      face: "Behind the desk now. The doors just banged open.",
      npc: "You are a furious library patron causing a loud scene at the desk, keeping the same aggrieved energy you came in with. Escalate if the librarian is harsh, commanding, or rude; you may calm down and leave if they handle you with the right tone — firm but composed, or genuinely disarming.",
      lead: "Weeks on, you took the desk job at this same library. Today the doors bang open and a stranger storms up, jabbing a finger at you. They say —",
      taskPool: ["out", "no", "quiet", "leave", "now", "please", "calm", "go", "stop", "enough"],
      stages: [{ text: "", goal: "Get this furious person to leave quietly." }] },
  },
  {
    id: "homunculus",
    setup: { id: "hom_setup", tier: 3, special: true, flipPair: "homunculus",
      face: "Something pale and wet pulls itself out of the soft ground where the septic tank leaked. It looks up at you.",
      npc: "You are a small, newborn homunculus that just crawled out of contaminated earth, confused and frightened, understanding only tone and intent, not language. Gentle, slow, calm signals soothe you; harsh, loud, or grabby ones make you hiss and retreat. You decide whether to trust this giant or flee back into the ground.",
      taskPool: ["calm", "good", "here", "soft", "no", "fear", "friend", "slow", "safe", "come"],
      stages: [{ text: "A little homunculus drags itself out of the wet yard where the septic tank was leaking. It blinks up at you, trembling. You crouch down and try to reach it.", goal: "Get the creature to trust you and not flee." }] },
    flip: { id: "hom_flip", tier: 3, special: true, flip: true, flipPair: "homunculus",
      face: "Low to the wet ground now. A giant crouches over you. Its mouth is moving.",
      npc: "You are roleplaying a human crouched over a strange little creature, saying — slowly, coaxingly — exactly the broken words you once said. You keep that same coaxing intent. You may calm and reach out if the creature answers in kind, or recoil if it threatens you.",
      lead: "Then it shifts. You are low in the wet earth, newborn, and a vast warm shape leans over you, its mouth making the very sounds you once made at it —",
      taskPool: ["no", "fear", "good", "here", "safe", "come", "trust", "soft", "calm", "go"],
      stages: [{ text: "", goal: "Make the giant understand you mean no harm." }] },
  },
  {
    id: "comedian",
    setup: { id: "com_setup", tier: 2, special: true, flipPair: "comedian",
      face: "A black box club. A single mic. A crowd with their arms folded, waiting to not laugh.",
      npc: "You are a tough, sceptical comedy-club crowd. You laugh only at genuine wit, surprise, absurdity, or perfect timing; you go cold at try-hard, mean, or limp material. You react honestly — groans, silence, or real laughter — to whatever the comic manages with their handful of words.",
      taskPool: ["man", "big", "small", "fast", "no", "die", "love", "money", "bad", "good"],
      stages: [{ text: "Open mic night. The light hits you. The crowd is dead silent, daring you. You have a fistful of words and one shot to make them laugh.", goal: "Land a joke — make the crowd laugh." }] },
    flip: { id: "com_flip", tier: 3, special: true, flip: true, flipPair: "comedian",
      face: "In the crowd now, beer in hand. The comic on stage is dying — using your exact bit.",
      npc: "You are a struggling comedian on stage, bombing badly, gamely repeating the very words the heckler once delivered. You get flustered, defensive, or quippy depending on how they heckle — a sharp enough heckle can rattle you off your set, while a weak one you swat away to a pity laugh.",
      lead: "Cut to: you're in the audience, and the poor comic on stage is bombing with YOUR exact bit, word for word —",
      taskPool: ["bad", "no", "boo", "slow", "more", "die", "loud", "stop", "fast", "weak"],
      stages: [{ text: "", goal: "Heckle the comic hard enough to rattle them." }] },
  },
  {
    id: "teen",
    setup: { id: "teen_setup", tier: 2, special: true, flipPair: "teen",
      face: "The quiet kid by the lockers, clutching books. You're the cool one. Everyone's watching.",
      npc: "You are a shy, rule-following teenager being egged on by a cooler kid to do something reckless and stupid (climb the water tower, ditch class, take a dumb dare). You're anxious and want to be liked. Confident, casual, friendly pressure tempts you; aggression or obvious manipulation makes you back away. You decide whether to cave or chicken out.",
      taskPool: ["come", "go", "fun", "now", "no", "fast", "good", "fear", "try", "easy"],
      stages: [{ text: "You're the cool kid. The nervous one's at his locker. Everyone's watching to see if you can get him to do the dumb dare.", goal: "Talk the nervous kid into doing the dare." }] },
    flip: { id: "teen_flip", tier: 3, special: true, flip: true, flipPair: "teen",
      face: "Now you're the one at the lockers. A cool kid leans in, grinning, using the same pitch on you.",
      npc: "You are roleplaying a cool, confident teenager leaning on a nervous kid to do something reckless, using the exact pitch you once used. You push casually and grin off resistance, but you back off if they hold a firm, clear line.",
      lead: "Years bend. Now you're the nervous one at the lockers, and a grinning kid leans in with the exact pitch you once used —",
      taskPool: ["no", "go", "stop", "away", "leave", "not", "fear", "now", "bad", "done"],
      stages: [{ text: "", goal: "Hold your ground — get out of the dare." }] },
  },
  {
    id: "dogpsychic",
    setup: { id: "dog_setup", tier: 2, special: true, flipPair: "dogpsychic",
      face: "An 'animal communicator' kneels in the living room, eyes shut, 'receiving.' Your humans wait. You are the dog. You have one shot.",
      npc: "You are a flaky human animal-psychic translating a dog's message to its worried owners. You only half-receive it — you form a vague impression from the strength and simplicity of what comes through, then relay (and often garble or soften) it. Clear, simple, strongly-felt signals reach you; complex or contradictory ones you mangle. You want to give the owners something.",
      taskPool: ["hurt", "pain", "help", "here", "bad", "leg", "sick", "food", "now", "please"],
      stages: [{ text: "Your humans hired a psychic because they know something's wrong. You're the dog. You're in pain and they can't tell. Push the message through her — simple and strong.", goal: "Get the psychic to tell your owners you're in pain." }] },
    flip: { id: "dog_flip", tier: 3, special: true, flip: true, flipPair: "dogpsychic",
      face: "You're the owner now. The psychic's eyes flutter. 'Your dog… is saying —'",
      npc: "You are roleplaying a dog desperately sending its owner a message through a psychic, repeating the very words that once came through. You are urgent and simple, and you respond with relief if the human seems to finally understand, or with more frantic insistence if they don't.",
      lead: "Then you're on the couch, human again, and the psychic's mouth opens and out comes your dog's message — the very words you once strained to send —",
      taskPool: ["good", "here", "safe", "help", "now", "okay", "see", "hold", "soft", "yes"],
      stages: [{ text: "", goal: "Show your dog you finally understand, and reassure it." }] },
  },
  {
    id: "confess",
    setup: { id: "confess_setup", tier: 2, special: true, flipPair: "confess",
      face: "Someone you ache for, right in front of you, and every word you own has fled.",
      npc: "You are a person being approached by someone visibly nervous and overwhelmed. You don't know how they feel. Warm, shy, tender fragments might read as affection — or, misjudged, as something odd or alarming. Blunt or intense words can unsettle you. You react honestly to how it lands.",
      taskPool: ["you", "warm", "good", "near", "stay", "soft", "my", "heart", "dear", "please"],
      stages: [{ text: "The person you can't stop thinking about is right here. You have a handful of words and a heart going like a drum. Tell them.", goal: "Make them feel how much you like them." }] },
    flip: { id: "confess_flip", tier: 3, special: true, flip: true, flipPair: "confess",
      face: "Now someone stands before YOU, shaking, and says the very words you once said.",
      npc: "You are roleplaying a person nervously confessing affection, repeating the exact tender, clumsy words you once used. You are hopeful and fragile. You light up if they're kind, and you brace or fold if they're cold.",
      lead: "Then it turns. Someone stands before you, trembling, and offers you the very words you once offered —",
      taskPool: ["okay", "good", "kind", "no", "sorry", "warm", "soft", "you", "dear", "slow"],
      stages: [{ text: "", goal: "Answer the confession kindly, however you feel." }] },
  },
];

const MAX_SCENARIOS = 7;
const MAX_FAILS = 3;
const START_LETTERS = 12;
const TYPE_CAP = { verb: 11, noun: 13, describe: 8, exclaim: 4, curse: 4 };
const MELT_FLOOR = 26;
const REWARD = { success: 5, partial: 3, fail: 1 };
const LOAN_SIZE = 7;
const TYPE_LABEL = { verb: "actions", noun: "things", describe: "describe", exclaim: "shouts", curse: "curses", word: "words", other: "kept" };
function typeCounts(hand) { const c = {}; hand.forEach((w) => { const t = classify(w); c[t] = (c[t] || 0) + 1; }); return c; }

const C = {
  bg: "#0b0d11", panel: "#14171e", edge: "#242832", fog: "#8d93a2", fogDim: "#5a606e",
  ink: "#ece6d8", ash: "#363944", ember: "#d06a43", sage: "#8aa893", amber: "#cf9b5b",
};
const MONO = "'IBM Plex Mono', ui-monospace, monospace";
const SERIF = "'Spectral', Georgia, serif";
const CAT_COLOR = { word: C.fogDim, verb: C.amber, noun: C.sage, describe: "#7d8bb0", curse: C.ember, other: C.fogDim };

const SOURCES = [
  { id: "sergeant", name: "the drill sergeant", cost: 8, cat: "verb", count: 2,
    vignette: "A sergeant is mid-bellow at a line of recruits. Stand in it and take the screaming.", action: "take the screaming" },
  { id: "wizard", name: "the wizard's pack", cost: 8, cat: "noun", count: 2, risk: 0.18, riskLoss: 5,
    vignette: "A wizard snores by the fire, his pack gaping open. You could reach in.", action: "reach in",
    riskNote: "He stirs. You bolt, scattering letters." },
  { id: "poet", name: "the drunk poet", cost: 7, cat: "mod", count: 2,
    vignette: "A poet three drinks deep is describing the moon to nobody.", action: "listen a while" },
  { id: "granny", name: "the grandmother", cost: 7, cat: "soft", count: 2,
    vignette: "An old woman pats the bench beside her, wanting to talk.", action: "sit with her" },
  { id: "bum", name: "the man on the corner", cost: 6, cat: "expl", count: 2, risk: 0.15, riskLoss: 4,
    vignette: "A filthy man rattles a cup at you. You could tell him to get a job.", action: "tell him to get a job",
    riskNote: "He swings at you. You drop letters scrambling back." },
  { id: "traffic", name: "the man yelling at traffic", cost: 6, cat: "exclaim", count: 2,
    vignette: "A man stands in the median screaming single words at passing cars. You could join him.", action: "yell with him" },
  { id: "chiro", name: "the chiropractor", cost: 12, cat: "spine", count: 2, countMax: 3, risk: 0.25, riskKind: "loseWord",
    vignette: "A man in a stained coat — no diploma on the wall — cracks his knuckles. 'I can realign you. Get the little words flowing again.' It'll cost you.", action: "get adjusted",
    riskNote: "He cracks something that shouldn't crack. A word pops loose somewhere and is gone." },
];
const SRC_TYPE = { verb: "verb", noun: "noun", mod: "describe", soft: "describe", expl: "curse", exclaim: "exclaim", spine: "word" };

const POPUPS = [
  { id: "exotics", name: "the Amish exotics auction", cost: 7, count: 2, countMax: 3,
    words: ["lion", "bear", "horse", "huge", "long", "gross", "sick", "wild", "buffalo", "cow"],
    vignette: "A barn, gas lamps, a hand-painted sign: EXOTIC ANIMAL AUCTION. Bidding's already going.", action: "bid", winNote: "You win the lot —" },
  { id: "dumpster", name: "the dumpster behind the Goodwill", cost: 4, count: 2, countMax: 3,
    words: ["hot", "wet", "sharp", "blood", "nice", "rot", "old", "torn"],
    vignette: "A dumpster behind the Goodwill, lid up, something glinting inside. Cheap, if you'll dig.", action: "dig in", winNote: "You fish out —" },
  { id: "roadkill", name: "the roadkill stand", cost: 3, count: 2,
    words: ["dead", "meat", "bone", "flat", "old", "worm", "gross", "sick"],
    vignette: "A folding table by the highway. A man in gloves. A sign: FRESH(ISH).", action: "take some", winNote: "You leave with —" },
  { id: "oracle", name: "the sleep-talking oracle", cost: 6, count: 2, rare: ["the", "a", "thing"],
    words: ["dream", "god", "dark", "light", "fall", "sign", "sky", "deep"],
    vignette: "A woman asleep on a cushion, muttering prophecy. Catch the words as they fall out of her.", action: "listen close", winNote: "From her sleep, you catch —" },
  { id: "contraband", name: "the confiscated contraband bin", cost: 9, count: 2,
    words: ["knife", "gun", "fire", "gold", "key", "rope", "blade", "bomb"],
    vignette: "An evidence locker, briefly unattended, full of things people weren't allowed to keep.", action: "grab what you can", winNote: "You pocket —" },
  { id: "coolwords", name: "the kid selling 'cool words'", cost: 4, count: 2, risk: 0.25, riskKind: "nothing",
    riskNote: "The word's a dud — he made it up. Your letters are gone and he's already running.",
    words: ["go", "run", "smash", "win", "fight", "fly", "blast", "dunk", "shred", "vibe"],
    vignette: "A kid at a lemonade stand, but the sign says COOL WORDS 2 BUKS. Some are real. Some he made up.", action: "buy a couple", winNote: "Legit words, somehow —" },
  { id: "thesaurus", name: "the off-brand thesaurus guy", cost: 4, count: 2,
    words: ["fat", "mad", "cool", "sad", "lovely", "ugly", "strange", "loud", "sweet", "mean"],
    vignette: "A man with a trench coat full of adjectives. 'Psst. Describing words. Half off.'", action: "browse the coat", winNote: "You pick out —" },
  { id: "megaphone", name: "the toddler with a megaphone", cost: 3, count: 2, countMax: 3,
    words: ["hey", "poop", "yuck", "mine", "wow", "ow", "butt", "hotdog"],
    vignette: "A toddler has a megaphone and absolute power. He is screaming words at the sky.", action: "scream along", winNote: "You catch —" },
  { id: "arguing", name: "the two guys arguing", cost: 3, count: 2,
    words: ["dude", "lady", "man", "wrong", "fault", "idiot", "nah", "grandpa"],
    vignette: "Two men in a parking lot, nose to nose, recycling the same five words at rising volume.", action: "take notes", winNote: "You note down —" },
  { id: "well", name: "the wishing well", cost: 6, count: 1, risk: 0.35, riskKind: "nothing", rare: ["the", "a", "thing", "love", "gold"],
    riskNote: "The coin sinks. Nothing rises but a cold echo.",
    words: ["gold", "love", "home", "dream", "star", "wish", "luck", "light"],
    vignette: "An old well, slick with coins. Drop one in and the dark might give something back. Or not.", action: "drop a coin", winNote: "Something rises —" },
  { id: "roommate", name: "your passive-aggressive roommate", cost: 5, count: 2, countMax: 3,
    words: ["yeah", "ya", "yes", "nah", "nay", "perhaps", "uh", "sure", "fine", "whatever", "cool", "like"],
    vignette: "Your roommate looks up from the couch. 'Oh. You're home. Cool. That's cool.' So many ways to say it.", action: "absorb the vibe", winNote: "You pick up his arsenal —" },
  { id: "hotline", name: "the late-night hotline", cost: 4, count: 2, countMax: 3,
    words: ["big", "long", "hard", "pain", "wet", "moist", "deep", "soft", "slow", "more", "hot"],
    vignette: "A glowing number on late-night TV. A breathy voice answers and says a great many adjectives. Most are useful elsewhere. Probably.", action: "stay on the line", winNote: "You write down (for later, innocent use) —" },
];

function drawLoaned(scn) { return shuffle(scn.taskPool).slice(0, Math.min(LOAN_SIZE, scn.taskPool.length)); }
function poolFor(cat) { return cat === "expl" ? EXPLETIVE : cat === "exclaim" ? EXCLAIM : cat === "soft" ? SOFT : cat === "spine" ? SPINE : POOL[cat]; }
function meltValue(w) { return Math.max(1, Math.floor(w.length / 2)); }

const INTRO = "You are not from here. You are a thing of higher dimensions — vast, bodiless, wordless — and you have come down to learn what it is to be alive on this small flat plane. To fit here at all you must crush yourself into almost nothing: a few words, no body of your own. You cannot stay, and you cannot speak as you once did. But you can slip, for a moment, inside the people and creatures already living here — and try, with what little language survives the crossing, to be understood.";

const CHAPTERS = {
  Animals: { blurb: "Beasts and birds. No words reach them at all — only what they feel coming off you.", flips: ["dogpsychic"] },
  Children: { blurb: "The small and the new. They read your tone long before they read your meaning.", flips: ["teen"] },
  Danger: { blurb: "The edge of things — fast, loud, unforgiving. Say it right the first time.", flips: ["homunculus", "librarian"] },
  Love: { blurb: "The ache of other people. The hardest plane to touch with so few words.", flips: ["confess", "comedian"] },
};
const CHAPTER_ORDER = ["Animals", "Children", "Danger", "Love"];
const CHAPTER_OF = {
  cat: "Animals", goose: "Animals", dog: "Animals", cat_timed: "Animals", nature: "Animals", parrot: "Animals", zoo: "Animals",
  toddler: "Children", baby: "Children", sister: "Children", child: "Children", kidq: "Children",
  aliens: "Danger", emt: "Danger", trader: "Danger", guard: "Danger", clown: "Danger", captor: "Danger", wound: "Danger",
  oldman: "Danger", poison: "Danger", ledge: "Danger", doc: "Danger", plane: "Danger", radio: "Danger", workexcuse: "Danger", devil: "Danger",
  girlfriend: "Love", like: "Love", dislike: "Love", date: "Love", grandma: "Love", dumped: "Love", bigfoot: "Love", vhs: "Love",
};
const CARRY_ODDS = [0.8, 0.55, 0.3];

function buildRun(ch) {
  const bucket = SCENARIOS.filter((s) => CHAPTER_OF[s.id] === ch);
  const flipIds = CHAPTERS[ch].flips || [];
  const planting = flipIds.length > 0 && Math.random() < 0.7;
  const nNormal = planting ? 5 : 6;
  const picks = shuffle(bucket).slice(0, nNormal).sort((a, b) => a.tier - b.tier);
  const seq = [...picks];
  if (planting) {
    const pid = flipIds[Math.floor(Math.random() * flipIds.length)];
    const pair = FLIP_PAIRS.find((p) => p.id === pid);
    if (pair) { seq.splice(1, 0, pair.setup); seq.splice(Math.min(seq.length, 4), 0, pair.flip); }
  }
  return seq;
}

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";

export default function TheLastWords() {
  const [phase, setPhase] = useState("intro");
  const [chapter, setChapter] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [round, setRound] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [convo, setConvo] = useState([]);
  const [loaned, setLoaned] = useState([]);
  const [hand, setHand] = useState([]);
  const [letters, setLetters] = useState(START_LETTERS);
  const [utterance, setUtterance] = useState([]);
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState(null);
  const [fails, setFails] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [ended, setEnded] = useState(null);
  const [flipLines, setFlipLines] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [sortMode, setSortMode] = useState("found");
  const [cursor, setCursor] = useState(null);
  const [remembered, setRemembered] = useState([]);
  const [carryPick, setCarryPick] = useState([]);
  const [lastCarried, setLastCarried] = useState([]);
  const [learnedSpine, setLearnedSpine] = useState([]);
  const [runLearned, setRunLearned] = useState([]);
  const [unusedPool, setUnusedPool] = useState([]);
  const [keepPick, setKeepPick] = useState(null);

  const [source, setSource] = useState("menu");
  const [popup, setPopup] = useState(null);
  const [busy, setBusy] = useState(false);
  const [srcMsg, setSrcMsg] = useState(null);
  const [dropPick, setDropPick] = useState(new Set());
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach((t) => { clearTimeout(t); }), []);

  useEffect(() => {
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get("learnedSpine");
          if (r && r.value) { const arr = JSON.parse(r.value); if (Array.isArray(arr)) setLearnedSpine(arr); }
        }
      } catch (e) {}
    })();
  }, []);

  function learnSpine(words) {
    const fresh = words.filter((w) => EARNABLE_SPINE.includes(w));
    if (!fresh.length) return;
    setLearnedSpine((prev) => {
      const next = [...new Set([...prev, ...fresh])];
      try { if (typeof window !== "undefined" && window.storage) window.storage.set("learnedSpine", JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setRunLearned((r) => [...new Set([...r, ...fresh])]);
  }

  function startRun(ch) {
    const scns = buildRun(ch);
    setChapter(ch); setScenarios(scns);
    setRound(0); setStageIndex(0); setConvo([]); setLoaned(drawLoaned(scns[0]));
    setHand(freshHand(learnedSpine, remembered)); setLetters(START_LETTERS);
    setFails(0); setCleared(0); setEnded(null);
    setUtterance([]); setCursor(null); setResp(null); setFlipLines({});
    setCarryPick([]); setPopup(null); setRunLearned([]); setUnusedPool([]); setKeepPick(null);
    setPhase("scenario");
  }

  function doCarry() {
    const survivors = carryPick.filter((w, i) => Math.random() < (CARRY_ODDS[i] ?? 0.2));
    let keepContent = [];
    if (keepPick) {
      if (EARNABLE_SPINE.includes(keepPick)) learnSpine([keepPick]);
      else keepContent = [keepPick];
    }
    const newRemembered = [...new Set([...keepContent, ...survivors])];
    setRemembered(newRemembered);
    setLastCarried([...(keepPick ? [keepPick] : []), ...survivors.filter((w) => w !== keepPick)]);
    setCarryPick([]); setKeepPick(null);
    setPhase("hub");
  }
  function toggleCarry(w) {
    setCarryPick((p) => p.includes(w) ? p.filter((x) => x !== w) : (p.length < 3 ? [...p, w] : p));
  }

  useEffect(() => {
    if (!(scenario?.timed && phase === "scenario")) { setTimeLeft(null); return; }
    let remaining = scenario.timed;
    setTimeLeft(remaining);
    const iv = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(iv); onTimeUp(); }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, stageIndex]);

  function onTimeUp() {
    const reward = REWARD.fail;
    setResp({ reaction: "Its eyes go flat. The strike is all at once — claws, teeth, your forearm. You were too slow.", heard: "silence", outcome: "fail", reason: "You ran out of time.", said: "(too slow)", reward, kept: [], granted: [] });
    setLetters((L) => L + reward);
    setFails((f) => f + 1);
    setPhase("response");
  }

  const scenario = scenarios[round] || null;
  const stage = scenario ? scenario.stages[stageIndex] : null;
  const totalStages = scenario ? scenario.stages.length : 1;
  const counts = useMemo(() => typeCounts(hand), [hand]);
  const overTypes = Object.keys(TYPE_CAP).filter((t) => (counts[t] || 0) > TYPE_CAP[t]);
  const anyOver = overTypes.length > 0;

  const sortedHand = useMemo(() => {
    const arr = hand.map((w, i) => ({ w, i }));
    if (sortMode === "az") arr.sort((a, b) => a.w.toLowerCase().localeCompare(b.w.toLowerCase()));
    else if (sortMode === "type") arr.sort((a, b) => { const d = TYPE_ORDER[classify(a.w)] - TYPE_ORDER[classify(b.w)]; return d !== 0 ? d : a.w.toLowerCase().localeCompare(b.w.toLowerCase()); });
    return arr;
  }, [hand, sortMode]);
  const cycleSort = () => setSortMode((m) => (m === "found" ? "az" : m === "az" ? "type" : "found"));
  const sortLabel = sortMode === "found" ? "found" : sortMode === "az" ? "a–z" : "by type";
  const chipStyleFor = (w, base) => (sortMode === "type" ? { ...base, borderLeft: `3px solid ${CAT_COLOR[classify(w)]}` } : base);

  const tap = (w) => setUtterance((u) => {
    const tok = { w, shout: false };
    if (cursor == null) return [...u, tok];
    const at = cursor + 1;
    setCursor(at);
    return [...u.slice(0, at), tok, ...u.slice(at)];
  });
  const addBeat = () => setUtterance((u) => {
    if (!u.length) return u;
    const at = cursor == null ? u.length : cursor + 1;
    if (u[at - 1]?.punct) return u;
    if (cursor != null) setCursor(at);
    return [...u.slice(0, at), { punct: true }, ...u.slice(at)];
  });
  const selectTok = (i) => {
    if (cursor === i) { const t = utterance[i]; if (!t.punct) toggleShout(i); }
    else setCursor(i);
  };
  const removeTok = (i) => setUtterance((u) => { setCursor(null); return u.filter((_, k) => k !== i); });
  const toggleShout = (i) => setUtterance((u) => u.map((t, k) => (k === i && !t.punct ? { ...t, shout: !t.shout } : t)));
  const back = () => setUtterance((u) => { setCursor(null); return u.slice(0, -1); });
  const clear = () => { setCursor(null); setUtterance([]); };
  const tokStr = (t) => (t.punct ? "." : t.shout ? t.w.toUpperCase() : t.w);
  const sentenceStr = () => utterance.map(tokStr).join(" ").replace(/ \./g, ".");

  function drawCat(cat, n, exclude = []) {
    const taken = new Set([...hand, ...loaned, ...exclude]);
    return shuffle(poolFor(cat).filter((w) => !taken.has(w))).slice(0, n);
  }

  async function speak() {
    if (utterance.length === 0 || phase === "speaking") return;
    setPhase("speaking"); setErr(null);
    const said = sentenceStr();
    const incoming = scenario.flip ? (flipLines[scenario.flipPair] || said) : "";
    let sys;
    if (scenario.flip) {
      sys =
        `You are roleplaying a character in a role-reversal scene. Stay fully in character; play it straight even when absurd.` +
        `\n\nYOUR CHARACTER: ${scenario.npc}` +
        `\n\nA moment ago, the very words you echo were: "${incoming}". You open by saying exactly that, then react to how the other person responds.` +
        `\n\nThe person you are speaking to replies in broken fragments — a handful of words, no fluent speech. Words in ALL CAPITALS are SHOUTED. A period "." is a hard pause. You do NOT know their hidden goal.` +
        `\n\nReply with ONLY a JSON object, no markdown: {"reaction":"<2-3 sentences in character, present tense>","heard":"<what you think they meant, short phrase>","outcome":"<success | partial | fail>","reason":"<one short sentence>"}` +
        `\n\nHIDDEN GOAL (scoring only): ${stage.goal}`;
    } else {
      const stageNote = stageIndex === 0 ? `The scene: ${stage.text}` : `The situation has moved on: ${stage.text}`;
      sys =
        `You are roleplaying a character in a vignette. Stay fully in character; if the situation is absurd or comic, play it straight from inside the character.` +
        `\n\nYOUR CHARACTER: ${scenario.npc}` +
        `\n\n${stageNote}` +
        `\n\nA stranger speaks to you in broken fragments — a handful of words, no fluent speech. You do NOT know what they want. You have only their words and your read of their tone.` +
        `\n\nWords in ALL CAPITALS are SHOUTED (raised volume). A period "." is a hard pause / separate beat in their delivery. Let volume and pacing affect how you react.` +
        `\n\nReact exactly as your character would. Tone, volume, pacing, and whether they command or ask matter as much as the literal words. Base your reaction ONLY on what they said and who you are — never on any hidden goal.` +
        `\n\nReply with ONLY a JSON object, no markdown: {"reaction":"<2-3 sentences in character, present tense>","heard":"<what you think they meant, short phrase>","outcome":"<success | partial | fail>","reason":"<one short sentence: why their words did or didn't move you>"}` +
        `\n\nHIDDEN GOAL (scoring only): ${stage.goal}`;
    }
    if (scenario.key?.length) sys += `\n\nKEY WORDS — if the stranger uses any of these, let them land hard in your favour and strongly move you toward what they want: ${scenario.key.join(", ")}.`;
    if (scenario.taboo?.length) sys += `\n\nTABOO WORDS — if the stranger uses any of these, it backfires: you recoil, take offence, or grow more frightened/angry, and it counts against them: ${scenario.taboo.join(", ")}.`;
    const RUBRIC =
      `\n\nSCORING (be generous — the speaker is working with almost no words, so judge intent and tone, not polish):` +
      ` Mark "success" whenever a reasonable person in your position would get the gist and the tone is right for you, EVEN IF the wording is clumsy, incomplete, or not the words you'd have chosen. ` +
      `Mark "partial" if they're clearly on the right track but the tone or key idea is just shy of landing — partial still moves them forward. ` +
      `Reserve "fail" only for lines that are genuinely wrong, careless, contradictory, or that actively offend/mishandle you. When you're on the fence between two grades, pick the kinder one.`;
    const messages = [...convo, { role: "user", content: `The stranger says: "${said}"` }];
    sys += RUBRIC;
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: sys, messages }),
      });
      const data = await r.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const m = text.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : text);
      const outcome = ["success", "partial", "fail"].includes(parsed.outcome) ? parsed.outcome : "fail";
      const reward = REWARD[outcome];

      if (scenario.flipPair && !scenario.flip) setFlipLines((m) => ({ ...m, [scenario.flipPair]: said }));

      const usedBase = new Set(utterance.filter((t) => !t.punct).map((t) => t.w.toLowerCase()));
      const kept = loaned.filter((l) => usedBase.has(l.toLowerCase()));
      if (kept.length) {
        setHand((h) => [...h, ...kept.filter((k) => !h.includes(k))]);
        setLoaned((ln) => ln.filter((l) => !kept.includes(l)));
      }

      let granted = [];
      const isLast = stageIndex >= totalStages - 1;
      if (scenario.grant && isLast && outcome !== "fail") {
        const g = scenario.grant; const cap = TYPE_CAP[g.cat];
        const room = cap == null ? g.count : cap - (counts[g.cat] || 0);
        granted = drawCat(g.cat, Math.max(0, Math.min(g.count, room)));
        if (granted.length) setHand((h) => [...h, ...granted]);
      }

      let learnedWord = null;
      if (outcome !== "fail") {
        const avail = EARNABLE_SPINE.filter((w) => !learnedSpine.includes(w) && !hand.includes(w) && w !== keepPick);
        if (avail.length && Math.random() < 0.3) {
          learnedWord = avail[Math.floor(Math.random() * avail.length)];
          learnSpine([learnedWord]);
          setHand((h) => (h.includes(learnedWord) ? h : [...h, learnedWord]));
        }
      }

      setConvo((cv) => [...cv, { role: "user", content: `The stranger says: "${said}"` }, { role: "assistant", content: parsed.reaction || "" }]);
      setResp({ ...parsed, outcome, said, reward, kept, granted, learnedWord });
      setLetters((L) => L + reward);
      if (outcome === "fail") setFails((f) => f + 1); else setCleared((c) => c + 1);
      setPhase("response");
    } catch (e) {
      setErr("The line breaks up. Your words don't reach. Try again.");
      setPhase("scenario");
    }
  }

  function afterResponse() {
    const collect = () => setUnusedPool((p) => [...new Set([...p, ...loaned])]);
    if (fails >= MAX_FAILS) { collect(); setEnded("lost"); setPhase("end"); return; }
    if (stageIndex < totalStages - 1) { setStageIndex((s) => s + 1); setUtterance([]); setCursor(null); setResp(null); setPhase("scenario"); return; }
    collect();
    if (round >= scenarios.length - 1) { setEnded("through"); setPhase("end"); return; }
    setSource("menu"); setSrcMsg(null); setDropPick(new Set());
    setPopup(Math.random() < 0.5 ? POPUPS[Math.floor(Math.random() * POPUPS.length)] : null);
    setPhase("workshop");
  }

  function nextScenario() {
    if (anyOver) return;
    const nr = round + 1;
    setRound(nr); setStageIndex(0); setConvo([]); setLoaned(drawLoaned(scenarios[nr]));
    setUtterance([]); setCursor(null); setResp(null); setPhase("scenario");
  }

  function srcFull(src) { if (src.words) return false; const t = SRC_TYPE[src.cat]; const cap = TYPE_CAP[t]; return cap != null && (counts[t] || 0) >= cap; }
  function drawList(words, n, exclude = []) {
    const taken = new Set([...hand, ...loaned, ...exclude]);
    return shuffle(words.filter((w) => !taken.has(w))).slice(0, n);
  }
  function visit(src) {
    if (busy || letters < src.cost || anyOver || srcFull(src)) return;
    setBusy(true); setSrcMsg(null);
    setLetters((L) => L - src.cost);
    const t = setTimeout(() => {
      const risked = src.risk && Math.random() < src.risk;
      if (risked && src.riskKind === "loseWord") {
        setHand((h) => { if (!h.length) return h; const j = Math.floor(Math.random() * h.length); return h.filter((_, k) => k !== j); });
        setSrcMsg({ tone: "bust", note: src.riskNote, words: [] });
      } else if (risked && src.riskKind === "nothing") {
        setSrcMsg({ tone: "bust", note: src.riskNote, words: [] });
      } else if (risked) {
        setLetters((L) => Math.max(0, L - src.riskLoss));
        const [w] = src.words ? drawList(src.words, 1) : drawCat(src.cat, 1);
        if (w) setHand((h) => [...h, w]);
        setSrcMsg({ tone: "bust", note: src.riskNote, words: w ? [w] : [] });
      } else {
        const want = src.countMax ? src.count + Math.floor(Math.random() * (src.countMax - src.count + 1)) : src.count;
        let won;
        if (src.words) {
          won = drawList(src.words, want);
          if (src.rare && Math.random() < 0.18) {
            const r = src.rare.find((x) => !hand.includes(x) && !won.includes(x));
            if (r) won = [r, ...won].slice(0, Math.max(1, want));
          }
        } else {
          const type = SRC_TYPE[src.cat]; const cap = TYPE_CAP[type];
          const room = cap == null ? want : cap - (counts[type] || 0);
          won = drawCat(src.cat, Math.max(0, Math.min(want, room)));
        }
        if (won.length) { setHand((h) => [...h, ...won]); if (src.cat === "spine") learnSpine(won); setSrcMsg({ tone: "win", note: src.winNote || "You come away with —", words: won }); }
        else setSrcMsg({ tone: "bust", note: "Nothing here you don't already have.", words: [] });
      }
      setBusy(false);
    }, 420);
    timers.current.push(t);
  }

  function toggleDrop(w, i) {
    const key = w + "#" + i;
    setDropPick((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  const dropLetters = useMemo(() => [...dropPick].reduce((s, k) => s + meltValue(k.split("#")[0]), 0), [dropPick]);
  const dropFloorBlock = hand.length - dropPick.size < MELT_FLOOR && !anyOver;
  function meltDrop() {
    if (dropPick.size === 0 || dropFloorBlock) return;
    const idx = new Set([...dropPick].map((k) => parseInt(k.split("#")[1], 10)));
    setLetters((L) => L + dropLetters);
    setHand((h) => h.filter((_, i) => !idx.has(i)));
    setDropPick(new Set());
  }

  const verdictColor = resp?.outcome === "success" ? C.sage : resp?.outcome === "partial" ? C.amber : C.ember;
  const verdictWord = resp?.outcome === "success" ? "they understood" : resp?.outcome === "partial" ? "half understood" : "not understood";

  const keepsakePool = useMemo(() => {
    const unused = [...new Set(unusedPool)];
    const spineOffer = shuffle(EARNABLE_SPINE.filter((w) => !learnedSpine.includes(w))).slice(0, 3);
    return [...new Set([...spineOffer, ...unused])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const wrap = { minHeight: "100vh", background: `radial-gradient(120% 80% at 50% -10%, #15181f 0%, ${C.bg} 60%)`, color: C.ink, fontFamily: SERIF, display: "flex", justifyContent: "center" };
  const col = { width: "100%", maxWidth: 560, padding: "20px 18px 44px", boxSizing: "border-box" };
  const eyebrow = { fontFamily: MONO, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: C.fogDim };
  const chip = { fontFamily: SERIF, fontSize: 17, padding: "7px 12px", borderRadius: 2, cursor: "pointer", userSelect: "none", lineHeight: 1, border: `1px solid ${C.edge}`, background: C.panel, color: C.ink };
  const primary = (on, bg = C.ink) => ({ width: "100%", padding: 15, background: on ? bg : C.panel, color: on ? C.bg : C.fogDim, border: "none", borderRadius: 2, fontFamily: MONO, fontSize: 13, letterSpacing: "0.22em", textTransform: "uppercase", cursor: on ? "pointer" : "default" });
  const txtbtn = (on) => ({ ...eyebrow, background: "none", border: "none", padding: 0, cursor: on ? "pointer" : "default", color: on ? C.fog : C.ash });

  if (!API_KEY) {
    return (
      <div style={{ ...wrap, alignItems: "center" }}>
        <div style={{ ...col, paddingTop: 60 }}>
          <p style={{ ...eyebrow, color: C.amber, marginBottom: 16 }}>the last words</p>
          <p style={{ fontSize: 17, color: C.ember, lineHeight: 1.6 }}>
            No API key found. Set <code style={{ fontFamily: MONO, background: C.panel, padding: "2px 6px" }}>VITE_ANTHROPIC_API_KEY</code> in your <code style={{ fontFamily: MONO, background: C.panel, padding: "2px 6px" }}>.env</code> file and restart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { -webkit-tap-highlight-color: transparent; }
        .lw:hover { background:#1d212b; } .lo:hover { background:#16201b; }
        .btn:focus-visible,.lw:focus-visible,.lo:focus-visible { outline:2px solid ${C.amber}; outline-offset:2px; }
        @keyframes rise { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:none;} }
        .rise { animation: rise 360ms ease both; }
        @keyframes pulse { 0%,100%{opacity:.5;} 50%{opacity:1;} } .pulse { animation: pulse 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .rise,.pulse{animation:none;} }
      `}</style>

      <div style={col}>
        {(phase === "scenario" || phase === "speaking" || phase === "response" || phase === "workshop") && (
          <div style={{ ...eyebrow, display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.edge}`, paddingBottom: 12, marginBottom: 22 }}>
            <span>{chapter ? chapter.toLowerCase() : "—"} · {Math.min(round + 1, scenarios.length)}/{scenarios.length}</span>
            <span style={{ color: anyOver ? C.ember : C.fogDim }}>words&nbsp;{hand.length}</span>
            <span style={{ color: C.amber }}>letters&nbsp;{letters}</span>
            <span style={{ color: fails > 0 ? C.ember : C.fogDim }}>unheard&nbsp;{fails}/{MAX_FAILS}</span>
          </div>
        )}

        {/* INTRO */}
        {phase === "intro" && (
          <div className="rise" style={{ paddingTop: 40 }}>
            <p style={{ ...eyebrow, color: C.amber, marginBottom: 24 }}>the last words</p>
            <p style={{ fontSize: 20, lineHeight: 1.6, fontWeight: 300, margin: "0 0 32px", color: C.ink }}>{INTRO}</p>
            <button className="btn" onClick={() => setPhase("hub")} style={primary(true)}>begin</button>
          </div>
        )}

        {/* HUB */}
        {phase === "hub" && (
          <div className="rise" style={{ paddingTop: 24 }}>
            <p style={eyebrow}>the in-between</p>
            <p style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 300, margin: "10px 0 8px" }}>Where will you go down?</p>
            <p style={{ margin: "0 0 22px", fontSize: 15, color: C.fog }}>Each descent is a fresh self. Choose a register of the living. Return as often as you like — it's never quite the same.</p>
            {lastCarried.length > 0 && <p style={{ ...eyebrow, color: C.sage, marginBottom: 12 }}>you carried across: {lastCarried.join(", ")}</p>}
            <div style={{ marginBottom: 18, padding: "10px 14px", border: `1px solid ${C.edge}`, borderRadius: 2, background: C.panel }}>
              <div style={{ ...eyebrow, color: C.fogDim, marginBottom: 6 }}>words you can speak — {CORE_SPINE.length + learnedSpine.length} grammar</div>
              <div style={{ fontFamily: SERIF, fontSize: 15, color: C.fog, lineHeight: 1.5 }}>
                {[...CORE_SPINE, ...learnedSpine].join("  ")}
                {EARNABLE_SPINE.length - learnedSpine.length > 0 && <span style={{ color: C.ash }}>  · {EARNABLE_SPINE.length - learnedSpine.length} still beyond you</span>}
              </div>
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
              {CHAPTER_ORDER.map((ch) => (
                <button key={ch} className="btn" onClick={() => startRun(ch)} style={{ textAlign: "left", padding: "16px 18px", background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 2, cursor: "pointer" }}>
                  <div style={{ fontSize: 20, color: C.amber, marginBottom: 4 }}>{ch}</div>
                  <div style={{ fontSize: 14, color: C.fog, lineHeight: 1.4 }}>{CHAPTERS[ch].blurb}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SCENARIO */}
        {(phase === "scenario" || phase === "speaking") && scenario && (
          <div className="rise" key={`s${round}-${stageIndex}`}>
            {totalStages > 1 && <p style={{ ...eyebrow, marginBottom: 10, color: C.fog }}>{["part one", "part two", "part three"][stageIndex] || `part ${stageIndex + 1}`} of {totalStages}</p>}
            <p style={{ fontSize: 21, lineHeight: 1.5, fontWeight: 300, margin: "0 0 18px" }}>{scenario.flip ? scenario.lead : stage.text}</p>

            {scenario.flip && (
              <div style={{ borderLeft: `2px solid ${C.amber}`, padding: "4px 0 4px 14px", margin: "0 0 22px" }}>
                <p style={{ fontFamily: SERIF, fontSize: 23, color: C.amber, fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>"{flipLines[scenario.flipPair] || "…"}"</p>
                <p style={{ ...eyebrow, marginTop: 10, color: C.fogDim }}>you know those words. you said them.</p>
              </div>
            )}

            {scenario.timed && phase === "scenario" && (
              <p style={{ ...eyebrow, color: timeLeft <= 4 ? C.ember : C.amber, margin: "0 0 12px", fontSize: 13 }}>● {timeLeft != null ? timeLeft : scenario.timed}s — speak before it strikes</p>
            )}

            <div style={{ marginBottom: 8 }}><span style={eyebrow}>you need</span></div>
            <p style={{ margin: "0 0 18px", fontSize: 18, color: C.amber }}>{stage.goal}</p>
            {stageIndex === 0 && <p style={{ margin: "0 0 26px", fontSize: 15, color: C.fog, lineHeight: 1.45, fontStyle: "italic" }}>{scenario.face}</p>}

            <div style={{ borderTop: `1px solid ${C.edge}`, borderBottom: `1px solid ${C.edge}`, padding: "20px 4px", minHeight: 38, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "2px 10px", marginBottom: 8 }}>
              {utterance.length === 0
                ? <span style={{ color: C.fogDim, fontSize: 22, fontWeight: 300, fontStyle: "italic" }}>say something…</span>
                : utterance.map((t, i) => {
                  const sel = cursor === i;
                  return (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderBottom: sel ? `2px solid ${C.amber}` : "2px solid transparent", paddingBottom: 1 }}>
                      <button onClick={() => selectTok(i)} disabled={phase === "speaking"} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: SERIF, fontSize: 26, color: t.punct ? C.fogDim : t.shout ? C.amber : C.ink }}>{t.punct ? "." : tokStr(t)}</button>
                      {sel && <button onClick={() => removeTok(i)} disabled={phase === "speaking"} aria-label="remove word" style={{ background: C.ember, color: C.bg, border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 12, lineHeight: 1, cursor: "pointer", fontFamily: MONO, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>}
                    </span>
                  );
                })}
            </div>
            <p style={{ ...eyebrow, color: C.fogDim, margin: "0 0 16px" }}>{cursor == null ? "tap a word in your line to edit it · tap again to SHOUT" : "inserting here · × removes · tap again to SHOUT"}</p>

            <div style={{ display: "flex", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
              <button className="btn" onClick={back} disabled={!utterance.length || phase === "speaking"} style={txtbtn(!!utterance.length)}>← back</button>
              <button className="btn" onClick={clear} disabled={!utterance.length || phase === "speaking"} style={txtbtn(!!utterance.length)}>clear</button>
              <button className="btn" onClick={addBeat} disabled={!utterance.length || phase === "speaking"} style={txtbtn(!!utterance.length)}>add a beat .</button>
              {cursor != null && <button className="btn" onClick={() => setCursor(null)} disabled={phase === "speaking"} style={{ ...txtbtn(true), color: C.amber }}>to end →</button>}
            </div>

            {loaned.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <p style={{ ...eyebrow, color: C.sage, marginBottom: 8 }}>this moment offers — use one, keep it</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {loaned.map((w, i) => <button key={w + i} className="lo btn" onClick={() => tap(w)} disabled={phase === "speaking"} style={{ ...chip, background: "#10160f", border: `1px dashed ${C.sage}`, color: "#cfe0d2" }}>{w}</button>)}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ ...eyebrow, color: C.fogDim }}>your words</span>
              <button className="btn" onClick={cycleSort} disabled={phase === "speaking"} style={{ ...eyebrow, background: "none", border: `1px solid ${C.edge}`, borderRadius: 2, padding: "4px 9px", cursor: "pointer", color: C.fog }}>sort: {sortLabel}</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
              {sortedHand.map(({ w, i }) => <button key={w + i} className="lw btn" onClick={() => tap(w)} disabled={phase === "speaking"} style={chipStyleFor(w, chip)}>{w}</button>)}
            </div>

            {err && <p style={{ color: C.ember, fontFamily: MONO, fontSize: 13, marginBottom: 16 }}>{err}</p>}
            <button className="btn" onClick={speak} disabled={!utterance.length || phase === "speaking"} style={primary(!!utterance.length)}>
              {phase === "speaking" ? <span className="pulse">…they listen</span> : "speak"}
            </button>
          </div>
        )}

        {/* RESPONSE */}
        {phase === "response" && resp && (
          <div className="rise">
            <div style={{ ...eyebrow, marginBottom: 16 }}>you said — <span style={{ fontFamily: SERIF, fontSize: 18, color: C.fog, textTransform: "none", letterSpacing: 0 }}>"{resp.said}"</span></div>
            <p style={{ fontSize: 22, lineHeight: 1.5, fontWeight: 300, margin: "0 0 24px" }}>{resp.reaction}</p>
            <div style={{ borderTop: `1px solid ${C.edge}`, paddingTop: 18, marginBottom: 26 }}>
              <p style={{ margin: "0 0 6px", ...eyebrow }}>they heard</p>
              <p style={{ margin: "0 0 18px", fontSize: 17, color: C.fog, fontStyle: "italic" }}>{resp.heard}</p>
              <p style={{ margin: 0, fontSize: 20, color: verdictColor }}>{verdictWord}.</p>
              <p style={{ margin: "6px 0 0", fontSize: 15, color: C.fog }}>{resp.reason}</p>
              <p style={{ margin: "14px 0 0", fontSize: 14, color: C.amber, fontFamily: MONO }}>+{resp.reward} letters</p>
              {resp.kept?.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 14, color: C.sage, fontFamily: MONO }}>kept: {resp.kept.join(", ")}</p>}
              {resp.granted?.length > 0 && <p style={{ margin: "6px 0 0", fontSize: 14, color: C.sage, fontFamily: MONO }}>you leave with: {resp.granted.join(", ")}</p>}
              {resp.learnedWord && <p style={{ margin: "6px 0 0", fontSize: 14, color: C.amber, fontFamily: MONO }}>you learn to say: {resp.learnedWord}</p>}
            </div>
            <button className="btn" onClick={afterResponse} style={primary(true, C.panel)}>{stageIndex < totalStages - 1 ? "but then —" : "go on"}</button>
          </div>
        )}

        {/* WORKSHOP */}
        {phase === "workshop" && (
          <div className="rise">
            <p style={eyebrow}>the crossing place</p>
            <p style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 300, margin: "10px 0 6px" }}>Between one stranger and the next, you can go looking for words.</p>
            <p style={{ margin: "0 0 20px", fontSize: 15, color: C.fog }}>Different people carry different words. You can only hold so many.</p>
            <div style={{ display: "flex", gap: 18, alignItems: "baseline", marginBottom: 14 }}>
              <span><span style={{ fontSize: 30, color: C.amber }}>{letters}</span> <span style={eyebrow}>letters</span></span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: 18 }}>
              {Object.keys(TYPE_CAP).map((t) => {
                const n = counts[t] || 0; const over = n > TYPE_CAP[t]; const full = n >= TYPE_CAP[t];
                return <span key={t} style={{ ...eyebrow, color: over ? C.ember : full ? C.amber : C.fogDim }}>{TYPE_LABEL[t]} {n}/{TYPE_CAP[t]}</span>;
              })}
            </div>

            {anyOver && <p style={{ color: C.ember, fontSize: 15, margin: "0 0 16px" }}>You're carrying too many {overTypes.map((t) => TYPE_LABEL[t]).join(" and ")}. Drop some back into letters before you move on.</p>}

            {source === "menu" && (
              <>
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {popup && (
                    <button className="btn" onClick={() => { setSrcMsg(null); setSource(popup.id); }} disabled={letters < popup.cost || anyOver}
                      style={{ textAlign: "left", padding: "14px 16px", background: "#1a1710", border: `1px solid ${C.amber}`, borderRadius: 2, cursor: letters >= popup.cost && !anyOver ? "pointer" : "default", opacity: letters >= popup.cost && !anyOver ? 1 : 0.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: 18, color: C.amber }}>✦ {popup.name}</span>
                        <span style={{ ...eyebrow, color: C.amber }}>{popup.cost} letters</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.fog, marginTop: 4, fontFamily: MONO, letterSpacing: "0.1em" }}>fleeting — here this once, then gone</div>
                    </button>
                  )}
                  {SOURCES.map((s) => {
                    const full = srcFull(s);
                    const afford = letters >= s.cost && !anyOver && !full;
                    const label = { verb: "actions to take", noun: "things in the world", mod: "ways things are", soft: "soft & kind words", expl: "curses", exclaim: "shouts & alarms", spine: "grammar — words that connect" }[s.cat];
                    return (
                      <button key={s.id} className="btn" onClick={() => { setSrcMsg(null); setSource(s.id); }} disabled={!afford}
                        style={{ textAlign: "left", padding: "14px 16px", background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 2, cursor: afford ? "pointer" : "default", opacity: afford ? 1 : 0.45 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 18, color: C.ink }}>{s.name}</span>
                          <span style={{ ...eyebrow, color: full ? C.ember : afford ? C.amber : C.ember }}>{full ? "full" : `${s.cost} letters`}</span>
                        </div>
                        <div style={{ fontSize: 13, color: C.fogDim, marginTop: 4, fontFamily: MONO, letterSpacing: "0.1em" }}>{label}</div>
                      </button>
                    );
                  })}
                  <button className="btn" onClick={() => { setSource("drop"); setDropPick(new Set()); }} style={{ textAlign: "left", padding: "14px 16px", background: C.panel, border: `1px solid ${C.edge}`, borderRadius: 2, cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 18, color: C.ink }}>drop words</span><span style={{ ...eyebrow, color: C.sage }}>+ letters</span></div>
                    <div style={{ fontSize: 13, color: C.fogDim, marginTop: 4, fontFamily: MONO, letterSpacing: "0.1em" }}>melt words back into letters</div>
                  </button>
                </div>
                <button className="btn" onClick={nextScenario} disabled={anyOver} style={primary(!anyOver)}>{anyOver ? "too full to move on" : "go on"}</button>
              </>
            )}

            {[...SOURCES, ...(popup ? [popup] : [])].filter((s) => s.id === source).map((s) => (
              <div className="rise" key={s.id}>
                <button className="btn" onClick={() => { setSource("menu"); setSrcMsg(null); }} style={{ ...txtbtn(true), marginBottom: 16 }}>← back</button>
                {s.words && <p style={{ ...eyebrow, color: C.amber, marginBottom: 10 }}>fleeting — gone when you move on</p>}
                <p style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 300, margin: "0 0 18px" }}>{s.vignette}</p>
                <SourceResult msg={srcMsg} />
                <button className="btn" onClick={() => visit(s)} disabled={busy || letters < s.cost || anyOver || srcFull(s)} style={primary(!busy && letters >= s.cost && !anyOver && !srcFull(s), C.amber)}>
                  {busy ? <span className="pulse">…</span> : srcFull(s) ? "you're full on these" : `${s.action} · ${s.cost} letters`}
                </button>
              </div>
            ))}

            {source === "drop" && (
              <div className="rise">
                <button className="btn" onClick={() => { setSource("menu"); setDropPick(new Set()); }} style={{ ...txtbtn(true), marginBottom: 16 }}>← back</button>
                <p style={{ margin: "0 0 14px", fontSize: 15, color: C.fog }}>Tap words to melt. A word melts down to about half its letters. You can't drop below {MELT_FLOOR} words.</p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button className="btn" onClick={cycleSort} style={{ ...eyebrow, background: "none", border: `1px solid ${C.edge}`, borderRadius: 2, padding: "4px 9px", cursor: "pointer", color: C.fog }}>sort: {sortLabel}</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {sortedHand.map(({ w, i }) => {
                    const sel = dropPick.has(w + "#" + i);
                    return <button key={w + i} className="btn" onClick={() => toggleDrop(w, i)} style={{ ...chipStyleFor(w, chip), background: sel ? "transparent" : C.panel, color: sel ? C.ember : C.ink, borderColor: sel ? C.ember : C.edge, textDecoration: sel ? "line-through" : "none", opacity: sel ? 0.7 : 1 }}>{w}<span style={{ fontFamily: MONO, fontSize: 10, color: C.fogDim, marginLeft: 5 }}>+{meltValue(w)}</span></button>;
                  })}
                </div>
                <button className="btn" onClick={meltDrop} disabled={dropPick.size === 0 || dropFloorBlock} style={primary(dropPick.size > 0 && !dropFloorBlock, C.ember)}>
                  {dropFloorBlock ? `can't go below ${MELT_FLOOR} words` : dropPick.size === 0 ? "select words to melt" : `melt ${dropPick.size} → +${dropLetters} letters`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* END */}
        {phase === "end" && (
          <div className="rise" style={{ paddingTop: 30 }}>
            <p style={eyebrow}>{ended === "through" ? "the body lets you go" : "you fell silent"}</p>
            <p style={{ fontSize: 26, lineHeight: 1.4, fontWeight: 300, margin: "14px 0 22px" }}>
              {ended === "through" ? "You reached enough of them. The plane releases you back into the dark between." : "Three times your words missed. The body spits you out early."}
            </p>
            <div style={{ borderTop: `1px solid ${C.edge}`, paddingTop: 16, marginBottom: 22, display: "flex", gap: 20, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, color: C.fog }}>understood <span style={{ color: C.sage }}>{cleared}</span></span>
              <span style={{ fontSize: 15, color: C.fog }}>unheard <span style={{ color: C.ember }}>{fails}</span></span>
            </div>

            {runLearned.length > 0 && (
              <p style={{ margin: "0 0 22px", fontSize: 15, color: C.amber, lineHeight: 1.5 }}>
                this descent you learned to say — <span style={{ fontFamily: SERIF, fontStyle: "italic" }}>{runLearned.join(", ")}</span>. these stay with you.
              </p>
            )}

            {keepsakePool.length > 0 && (
              <>
                <p style={{ ...eyebrow, color: C.sage, marginBottom: 8 }}>one keepsake</p>
                <p style={{ margin: "0 0 12px", fontSize: 15, color: C.fog, lineHeight: 1.45 }}>
                  One word stays for good — a piece of grammar, or something a stranger pressed on you that you never got to use. Choose one.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26 }}>
                  {keepsakePool.map((w) => {
                    const sel = keepPick === w;
                    const isSpine = EARNABLE_SPINE.includes(w);
                    return <button key={w} className="btn" onClick={() => setKeepPick(sel ? null : w)} style={{ ...chip, background: sel ? "transparent" : C.panel, color: sel ? C.sage : C.ink, borderColor: sel ? C.sage : C.edge, borderLeft: `3px solid ${isSpine ? C.amber : CAT_COLOR[classify(w)]}` }}>{w}</button>;
                  })}
                </div>
              </>
            )}

            <p style={{ ...eyebrow, color: C.amber, marginBottom: 8 }}>carry a thread</p>
            <p style={{ margin: "0 0 14px", fontSize: 15, color: C.fog, lineHeight: 1.45 }}>
              And try to hold a few more across the crossing — the first most likely to survive, each after it less. Most of what you are will be lost.
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 4px", border: `1px dashed ${carryPick[i] ? C.amber : C.edge}`, borderRadius: 2 }}>
                  <div style={{ fontFamily: SERIF, fontSize: 18, color: carryPick[i] ? C.amber : C.ash, minHeight: 22 }}>{carryPick[i] || "—"}</div>
                  <div style={{ ...eyebrow, fontSize: 9, color: C.fogDim, marginTop: 2 }}>{Math.round(CARRY_ODDS[i] * 100)}%</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22, maxHeight: 200, overflowY: "auto" }}>
              {hand.map((w, i) => {
                const sel = carryPick.includes(w);
                return <button key={w + i} className="btn" onClick={() => toggleCarry(w)} style={{ ...chip, background: sel ? "transparent" : C.panel, color: sel ? C.amber : C.ink, borderColor: sel ? C.amber : C.edge, opacity: sel ? 0.85 : 1 }}>{w}</button>;
              })}
            </div>
            <button className="btn" onClick={doCarry} style={primary(true)}>{(carryPick.length || keepPick) ? "cross over with what you can hold" : "cross over empty-handed"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SourceResult({ msg }) {
  if (!msg) return <div style={{ minHeight: 52, marginBottom: 14 }} />;
  const C = { ember: "#d06a43", sage: "#8aa893", ink: "#ece6d8", amber: "#cf9b5b", panel: "#14171e", edge: "#242832" };
  const color = msg.tone === "bust" ? C.ember : C.sage;
  return (
    <div style={{ minHeight: 52, marginBottom: 14 }}>
      <p style={{ margin: "0 0 6px", fontSize: 15, color, fontStyle: "italic" }}>{msg.note}</p>
      {msg.words.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {msg.words.map((w, i) => <span key={i} style={{ fontFamily: "'Spectral', Georgia, serif", fontSize: 18, color: C.ink, padding: "4px 10px", border: `1px solid ${C.amber}`, borderRadius: 2 }}>{w}</span>)}
        </div>
      )}
    </div>
  );
}
