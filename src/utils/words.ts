export type WordGroup = {
  id: string;
  label: string;
  words: string[];
};

export type Subcategory = {
  id: string;
  label: string;
  words?: string[];
  groups?: WordGroup[];
};

export type SoundCategory = {
  id: string;
  label: string;
  accent: string;
  accentSoft: string;
  ring: string;
  kind?: 'sound' | 'scene' | 'language';
  disabled?: boolean;
  subcategories: Subcategory[];
};

export const SCENES_SUB_ID = 'scenes';

export const SCENE_TITLES = [
  'Skiing', 'Winter', 'Farm', 'Biking', 'Bike Shop', 'Clothing Store', 'Camping', 'Canoeing', 'Park',
  'Horses', 'Soccer', 'Street', 'Post Office', 'Football Game', 'Carnival', 'Pool',
];

export const categories: SoundCategory[] = [
  {
    id: 'r',
    label: '/r/',
    accent: 'from-orange-500 to-orange-600',
    accentSoft: 'bg-orange-50 text-orange-700 border-orange-200',
    ring: 'ring-orange-300',
    subcategories: [
      {
        id: 'r-initial',
        label: 'Initial',
        words: ['row', 'rat', 'red', 'rain', 'rope', 'run', 'rake', 'rock', 'ride', 'road', 'read', 'robe', 'room', 'roof', 'roll', 'rose', 'wrap', 'reach', 'write', 'race'],
      },
      {
        id: 'r-medial',
        label: 'Medial',
        groups: [
          { id: 'r-medial-air', label: '/air/', words: ['fairy', 'parrot', 'scared', 'cherry', 'stairs', 'married', 'sharing', 'caribou', 'haircut', 'therapy', 'america', 'karaoke', 'library', 'parents', 'ferris wheel', 'very', 'wheelbarrow', 'heron', 'stereo', 'canary'] },
          { id: 'r-medial-ear', label: '/ear/', words: ['earring', 'cheering', 'hero', 'hearing', 'pyramid', 'zero', 'period', 'cafeteria', 'serious', 'clearing', 'steering', 'appearing'] },
          { id: 'r-medial-ar', label: '/ar/', words: ['hard', 'mars', 'barn', 'heart', 'march', 'shark', 'art', 'dark', 'card', 'carve', 'harp', 'marker', 'farmer', 'arctic', 'sharpies', 'garlic', 'charcoal', 'artichoke', 'armadillo', 'aardvark'] },
          { id: 'r-medial-or', label: '/or/', words: ['forty', 'north', 'shorts', 'bored', 'resort', 'cork', 'forest', 'orca', 'horse', 'dory', 'orange', 'order', 'sports', 'sword', 'popcorn', 'morning', 'story', 'porch', 'thorn'] },
          { id: 'r-medial-er', label: '/er/', words: ['birthday', 'first', 'germs', 'hurt', 'learn', 'purple', 'shirt', 'thirsty', 'words', 'thirteen', 'work', 'bird', 'turtle', 'yogurt', 'turn', 'thursday', 'thermos', 'surprise', 'dirt'] },
          { id: 'r-medial-ire', label: '/ire/', words: ['tired', 'firefly', 'hired', 'pliers', 'diary', 'iron', 'tires', 'ireland', 'firecracker'] },
          { id: 'r-medial-wr', label: '/w/ + /r/', words: ['worm', 'warm', 'warn', 'warp', 'warrior', 'world', 'reward', 'drawer', 'swirl', 'twirl', 'coral', 'floral', 'squirrel', 'quarrel', 'rural'] },
        ],
      },
      {
        id: 'r-final',
        label: 'Final',
        groups: [
          { id: 'r-final-air', label: '/air/', words: ['bear', 'fair', 'hair', 'air', 'pair', 'chair', 'where', 'there', 'share'] },
          { id: 'r-final-ear', label: '/ear/', words: ['deer', 'gear', 'pier', 'fear', 'year', 'cheer', 'spear', 'ear', 'tear', 'near', 'hear', 'clear', 'sphere', 'steer', 'here', 'root beer', 'disappear', 'engineer', 'volunteer', 'pioneer'] },
          { id: 'r-final-ar', label: '/ar/', words: ['car', 'far', 'jar', 'star', 'guitar', 'are', 'bar', 'scar', 'r'] },
          { id: 'r-final-or', label: '/or/', words: ['door', 'more', 'floor', 'core', 'tore', 'four', 'pour', 'snore', 'score', 'store', 'boar', 'oar', 'poor', 'roar', 'shore', 'sore', 'chore', 'before', 'explore', 'ignore'] },
          { id: 'r-final-er', label: '/er/', words: ['finger', 'letter', 'teacher', 'doctor', 'over', 'whisper', 'spider', 'feather', 'shower', 'zipper', 'hammer', 'ladder', 'flower', 'water', 'paper', 'winter', 'summer', 'toaster', 'weather', 'butter'] },
          { id: 'r-final-ire', label: '/ire/', words: ['fire', 'tire', 'dryer', 'choir', 'pacifier', 'vampire', 'wire', 'liar', 'sapphire'] },
          { id: 'r-final-rl', label: '/rl/', words: ['earl', 'girl', 'curl', 'pearl', 'hurl', 'carl', 'snarl', 'garlic', 'barrel', 'spiral', 'swirl', 'twirl', 'coral', 'floral', 'squirrel', 'quarrel', 'rural'] },
        ],
      },
      {
        id: 'r-blends',
        label: 'Blends',
        groups: [
          { id: 'gr', label: '/gr/', words: ['green', 'grapes', 'grow', 'grass', 'growl', 'gross', 'grandpa', 'grandma', 'gray', 'grater', 'gravy', 'grizzly', 'grilled cheese', 'grade', 'grasshopper', 'grab', 'grill', 'grains', 'graph', 'grapefruit'] },
          { id: 'kr', label: '/kr/', words: ['cry', 'crib', 'crocodile', 'cracked', 'crane', 'crash', 'crawl', 'crow', 'crown', 'crab', 'crackers', 'crayons', 'crutch', 'crafts', 'crate', 'cream', 'crowd', 'crush', 'cruise', 'criss cross'] },
          { id: 'pr', label: '/pr/', words: ['present', 'pretzel', 'princess', 'prince', 'proud', 'preschool', 'printer', 'press', 'problem', 'pray', 'pretend', 'pretty', 'prickly', 'price', 'professor', 'prison', 'prize', 'president', 'practice', 'principal'] },
          { id: 'br', label: '/br/', words: ['brown', 'bread', 'brain', 'bricks', 'brush', 'bracelet', 'broom', 'breeze', 'braid', 'bridge', 'broccoli', 'braces', 'broken', 'brother', 'brownie', 'branch', 'breakfast', 'bring', 'bright', 'bride'] },
          { id: 'fr', label: '/fr/', words: ['free', 'frog', 'fruit', 'fries', 'friends', 'freezie', 'fridge', 'friday', 'from', 'frame', 'front', 'fresh', 'frown', 'frosty', 'freckles', 'frosting', 'frisbee', 'fraction', 'frying', 'frustrated'] },
          { id: 'dr', label: '/dr/', words: ['drop', 'drain', 'dream', 'dress', 'draw', 'drawing', 'drill', 'drive', 'dragon', 'drink', 'dry', 'drone', 'drip', 'drum', 'dribble', 'dragonfly'] },
          { id: 'tr', label: '/tr/', words: ['tree', 'truck', 'trash', 'try', 'train', 'tracks', 'treasure', 'triangle', 'traffic', 'track', 'trout', 'trophy', 'tricycle', 'tractor', 'trumpet', 'trampoline', 'trouble', 'trip', 'tray', 'trapeze'] },
        ],
      },
    ],
  },
  {
    id: 'l',
    label: '/l/',
    accent: 'from-lime-400 to-lime-500',
    accentSoft: 'bg-lime-50 text-lime-800 border-lime-200',
    ring: 'ring-lime-300',
    subcategories: [
      { id: 'l-initial', label: 'Initial', words: ['leaf', 'leg', 'log', 'loaf', 'lunch', 'lid', 'lip', 'leak', 'lamb', 'lion', 'list', 'lamp', 'lock', 'lake', 'lime', 'light', 'ladder', 'lemon', 'letter', 'llama'] },
      { id: 'l-medial', label: 'Medial', words: ['pillow', 'salad', 'toilet', 'yellow', 'belly', 'balloons', 'silly', 'color', 'elbow', 'goalie', 'island', 'bowling', 'elephant', 'eleven', 'helicopter', 'ballerina', 'broccoli', 'violin', 'marshmallows', 'umbrella'] },
      { id: 'l-final', label: 'Final', words: ['ball', 'small', 'hill', 'bell', 'hole', 'wheel', 'call', 'fill', 'fall', 'whale', 'shell', 'mail', 'table', 'smile', 'pencil', 'pickle', 'bowl', 'school', 'tool', 'pool'] },
      {
        id: 'l-blends',
        label: 'Blends',
        groups: [
          { id: 'pl', label: '/pl/', words: ['plane', 'plate', 'plug', 'planets', 'play', 'plus', 'plum', 'plow', 'plant', 'pliers', 'plumber', 'player'] },
          { id: 'bl', label: '/bl/', words: ['blue', 'blender', 'blocks', 'blow', 'black', 'blueberry', 'blinds', 'blimp', 'blanket', 'blonde', 'blouse', 'blow dry'] },
          { id: 'fl', label: '/fl/', words: ['flower', 'flag', 'fly', 'floor', 'flute', 'floss', 'flamingo', 'flip flops', 'flush', 'flat', 'flame', 'float'] },
          { id: 'gl', label: '/gl/', words: ['glue', 'glasses', 'glove', 'glow', 'glad', 'globe', 'glacier', 'glitter', 'glare', 'glass', 'glider', 'gloomy'] },
          { id: 'kl', label: '/kl/', words: ['clap', 'cloud', 'clock', 'clue', 'clip', 'club', 'click', 'cliff', 'climb', 'class', 'claw', 'clown'] },
          { id: 'sl', label: '/sl/', words: ['slide', 'sleep', 'slime', 'slam', 'slip', 'slug', 'sled', 'slice', 'slow', 'sling', 'slinky', 'slippers', 'sleeping bag', 'sleigh', 'sleeve', 'sloth'] },
        ],
      },
    ],
  },
  {
    id: 's',
    label: '/s/',
    accent: 'from-amber-500 to-amber-600',
    accentSoft: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-300',
    subcategories: [
      { id: 's-ts', label: 'ts', words: ['its', 'ants', 'bats', 'hats', 'rats', 'boots', 'mitts', 'notes', 'lights', 'pants', 'plates', 'dots'] },
      { id: 's-initial', label: 'Initial', words: ['see', 'sit', 'soup', 'seal', 'sink', 'soap', 'salt', 'sock', 'sick', 'some', 'sun', 'sing', 'same', 'saw', 'soda', 'sad', 'six', 'seven', 'sign', 'sew'] },
      { id: 's-medial', label: 'Medial', words: ['pencil', 'dresser', 'dinosaur', 'glasses', 'whistle', 'listen', 'messy', 'recess', 'baseball', 'muscle', 'princess', 'bracelet', 'medicine', 'December', 'braces', 'castle', 'popsicle', 'dancer', 'classroom', 'grasshopper'] },
      { id: 's-final', label: 'Final', words: ['dress', 'bus', 'horse', 'ice', 'house', 'grass', 'mouse', 'mice', 'kiss', 'yes', 'pass', 'miss', 'boss', 'goose', 'geese', 'gas', 'hiss', 'palace', 'office', 'erase'] },
      {
        id: 's-blends',
        label: 'Blends',
        groups: [
          { id: 'st', label: '/st/', words: ['stop', 'stairs', 'stick', 'stove', 'stir', 'star', 'sticky', 'stool', 'stickers', 'stem', 'store', 'stamp', 'storm', 'start', 'stinky', 'stack', 'stew', 'stain', 'stand', 'staple'] },
          { id: 'sp', label: '/sp/', words: ['spoon', 'spill', 'sponge', 'spices', 'spinach', 'spaghetti', 'spiderweb', 'spin', 'speech', 'spider', 'spell', 'spotted', 'speak', 'spit', 'space', 'sports', 'sparkler', 'spout', 'spots', 'spa'] },
          { id: 'sk', label: '/sk/', words: ['ski', 'skirt', 'scooter', 'skunk', 'skip', 'skeleton', 'school', 'scoop', 'sky', 'scarecrow', 'scared', 'skin', 'skateboard', 'scale', 'skate', 'school bus', 'scar', 'skittles', 'scarf', 'scab'] },
          { id: 'sm', label: '/sm/', words: ['small', 'smell', 'smile', 'smoke', 'smore', 'smash', 'smarties', 'smush', 'smooth', 'smart', 'smear', 'smock'] },
          { id: 'sn', label: '/sn/', words: ['snowman', 'snuggle', 'snap', 'snout', 'snack', 'sniff', 'snake', 'snowball', 'sneaker', 'snowpants', 'snail', 'snip', 'snow', 'snore', 'snooze', 'snorkel', 'sneeze', 'sneak', 'snowflake'] },
          { id: 'sl', label: '/sl/', words: ['slide', 'sleep', 'slime', 'slam', 'slip', 'slug', 'sled', 'slice', 'slow', 'sling', 'slinky', 'slippers', 'sleeping bag', 'sleigh', 'sleeve', 'sloth'] },
          { id: 'sw', label: '/sw/', words: ['swim', 'sweat', 'sweet', 'swing', 'sweep', 'sweater', 'swan', 'swirl', 'swarm', 'swab', 'switch', 'swipe', 'swap', 'swamp', 'swish', 'swallow', 'swiss', 'swat', 'swell', 'sweet potato'] },
        ],
      },
    ],
  },
  {
    id: 'z',
    label: '/z/',
    accent: 'from-yellow-400 to-yellow-500',
    accentSoft: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    ring: 'ring-yellow-300',
    subcategories: [
      { id: 'z-initial', label: 'Initial', words: ['z', 'zebra', 'zip', 'zoo', 'zero', 'zucchini', 'zoe', 'zig zag', 'zack', 'zoom', 'zest', 'zamboni'] },
      { id: 'z-medial', label: 'Medial', words: ['present', 'lizard', 'music', 'busy', 'lazy', 'noisy', 'puzzle', 'jersey', 'newspaper', 'raspberry', 'cheeseburger', 'cozy', 'dizzy', 'wizard', 'dozen', 'desert', 'raisin', 'museum', 'Tuesday', 'Thursday'] },
      { id: 'z-final', label: 'Final', words: ['bees', 'sneeze', 'please', 'freeze', 'lose', 'prize', 'clothes', 'eyes', 'hose', 'cheese', 'boys', 'pigs', 'fries', 'shoes', 'toes', 'dogs', 'cows', 'keys', 'nose', 'knees'] },
    ],
  },
  {
    id: 'sh',
    label: '/sh/',
    accent: 'from-green-500 to-green-600',
    accentSoft: 'bg-green-50 text-green-700 border-green-200',
    ring: 'ring-green-300',
    subcategories: [
      { id: 'sh-initial', label: 'Initial', words: ['ship', 'sheep', 'shirt', 'shoe', 'shorts', 'shapes', 'shave', 'shoulders', 'shadow', 'share', 'she', 'shark', 'shampoo', 'shower', 'shovel', 'sheets', 'shake', 'shed', 'shells', 'shore'] },
      { id: 'sh-medial', label: 'Medial', words: ['seashells', 'sushi', 'dishes', 'lotion', 'fishing', 'caution', 'ocean', 'cashews', 'cushion', 'bookshelf', 'milkshake', 'flashlight', 'station', 'spaceship', 'horseshoe', 'marshmallow', 'emotion', 'magician', 'location', 'parachute'] },
      { id: 'sh-final', label: 'Final', words: ['fish', 'brush', 'splash', 'crush', 'leash', 'bush', 'crash', 'flush', 'trash', 'dish', 'push', 'wish', 'dash', 'wash', 'paintbrush', 'squish', 'finish', 'toothbrush', 'eyelash', 'cash'] },
    ],
  },
  {
    id: 'ch',
    label: '/ch/',
    accent: 'from-emerald-500 to-emerald-600',
    accentSoft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-300',
    subcategories: [
      { id: 'ch-initial', label: 'Initial', words: ['chew', 'chip', 'chalk', 'chair', 'check', 'cheer', 'chick', 'cheek', 'chase', 'choose', 'cherry', 'chess', 'chain', 'cheetah', 'chest', 'chili', 'chop', 'child', 'cheese', 'chin'] },
      { id: 'ch-medial', label: 'Medial', words: ['teacher', 'kitchen', 'nachos', 'ketchup', 'matches', 'nature', 'orchard', 'witches', 'catcher', 'pitcher', 'picture', 'lunchbox', 'reaching', 'statue', 'question', 'crutches', 'marching', 'vulture', 'wheelchair', 'creature'] },
      { id: 'ch-final', label: 'Final', words: ['watch', 'couch', 'witch', 'reach', 'hatch', 'catch', 'peach', 'wrench', 'porch', 'lunch', 'rich', 'beach', 'itch', 'coach', 'march', 'punch', 'ranch', 'speech', 'bench', 'pinch'] },
    ],
  },
  {
    id: 'th',
    label: '/th/',
    accent: 'from-red-500 to-red-600',
    accentSoft: 'bg-red-50 text-red-700 border-red-200',
    ring: 'ring-red-300',
    subcategories: [
      { id: 'th-voiced-initial', label: 'ð Initial', words: ['the', 'then', 'they', 'there', 'that', 'than', 'this', 'these', 'those', "they're", 'them', 'their'] },
      { id: 'th-voiced-medial', label: 'ð Medial', words: ['another', 'other', 'smoothie', 'brother', 'together', 'weather', 'bother', 'lather', 'clothing', 'gather', 'wither', 'bathing suit', 'leather', 'feather', 'either', 'breathing', 'father', 'mother', 'grandmother', 'grandfather'] },
      { id: 'th-voiceless-initial', label: 'θ Initial', words: ['thumb', 'thank you', 'theatre', 'thirsty', 'thin', 'thick', 'thermos', 'Thursday', 'thirty', 'thorn', 'third', 'thing', 'thunder', 'thanksgiving', 'thief', 'think', 'therapy', 'thermometer', 'thousand', 'thigh'] },
      { id: 'th-voiceless-medial', label: 'θ Medial', words: ['toothbrush', 'toothpaste', 'toothpick', 'toothache', 'bathroom', 'bathtub', 'bathrobe', 'mouthwash', 'something', 'nothing', 'everything', 'birthday', 'earthquake', 'panther', 'python', 'author', 'athlete', 'stethoscope', 'healthy', 'filthy'] },
      { id: 'th-voiceless-final', label: 'θ Final', words: ['with', 'earth', 'tooth', 'mouth', 'north', 'south', 'cloth', 'breath', 'math', 'booth', 'path', 'teeth', 'month', 'broth', 'fourth', 'moth', 'both', 'wreath', 'bath', 'sloth'] },
      { id: 'th-thr', label: '/thr/', words: ['three', 'throw', 'through', 'thread', 'throat', 'throb', 'threat', 'throne', 'thrift'] },
    ],
  },
  {
    id: 'j',
    label: '/j/',
    accent: 'from-teal-500 to-teal-600',
    accentSoft: 'bg-teal-50 text-teal-700 border-teal-200',
    ring: 'ring-teal-300',
    subcategories: [
      { id: 'j-initial', label: 'Initial', words: ['juice', 'jar', 'july', 'gym', 'jam', 'germs', 'jail', 'jeans', 'gem', 'jet', 'jump', 'jelly bean', 'jacket', 'juggle', 'giant', 'jello', 'jellyfish', 'giraffe', 'jungle', 'jupiter'] },
      { id: 'j-medial', label: 'Medial', words: ['angel', 'magic', 'pigeon', 'oranges', 'banjo', 'fidget', 'charger', 'pages', 'stranger', 'danger', 'soldier', 'hedgehog', 'vegetables', 'pajamas', 'lifejacket', 'fudgesicle', 'emergency', 'surgery', 'graduate', 'detergent'] },
      { id: 'j-final', label: 'Final', words: ['cage', 'badge', 'dodge', 'judge', 'page', 'bridge', 'fridge', 'orange', 'sponge', 'huge', 'ledge', 'garage', 'bandage', 'package', 'sausage', 'carriage', 'marriage', 'garbage', 'message', 'cabbage'] },
    ],
  },
  {
    id: 'k',
    label: '/k/',
    accent: 'from-blue-500 to-blue-600',
    accentSoft: 'bg-blue-50 text-blue-700 border-blue-200',
    ring: 'ring-blue-300',
    subcategories: [
      { id: 'k-initial', label: 'Initial', words: ['cow', 'cat', 'key', 'car', 'corn', 'coat', 'cut', 'kiwi', 'cone', 'kiss', 'cave', 'cough', 'kite', 'cage', 'call', 'cake', 'king', 'color', 'carrot', 'candle'] },
      { id: 'k-medial', label: 'Medial', words: ['monkey', 'bucket', 'cookie', 'hockey', 'turkey', 'biking', 'jacket', 'raccoon', 'vacuum', 'soccer', 'rocket', 'broccoli', 'bacon', 'taco', 'raking', 'marker', 'pumpkin', 'breakfast', 'necklace', 'haircut'] },
      { id: 'k-final', label: 'Final', words: ['bike', 'kick', 'lake', 'snake', 'leak', 'sick', 'sock', 'rake', 'knock', 'shark', 'beak', 'book', 'cake', 'hike', 'hook', 'duck', 'lock', 'walk', 'milk', 'lick'] },
    ],
  },
  {
    id: 'g',
    label: '/g/',
    accent: 'from-indigo-500 to-indigo-600',
    accentSoft: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ring: 'ring-indigo-300',
    subcategories: [
      { id: 'g-initial', label: 'Initial', words: ['go', 'game', 'gum', 'goose', 'gold', 'gas', 'goat', 'gift', 'ghost', 'golf', 'green', 'gate', 'grapes', 'girl', 'give', 'glue', 'garden', 'garage', 'goalie', 'garbage'] },
      { id: 'g-medial', label: 'Medial', words: ['wagon', 'tiger', 'finger', 'burger', 'lego', 'piggy', 'sugar', 'yogurt', 'dragon', 'angry', 'seagull', 'bagel', 'goggles', 'mango', 'bingo', 'magnet', 'yoga', 'bigger', 'eagle', 'kangaroo'] },
      { id: 'g-final', label: 'Final', words: ['bug', 'frog', 'leg', 'dog', 'big', 'log', 'dig', 'flag', 'egg', 'twig', 'pig', 'beg', 'wag', 'rug', 'wig', 'bag', 'hug', 'fog', 'plug', 'mug'] },
    ],
  },
  {
    id: 'ng',
    label: '/ng/',
    accent: 'from-violet-500 to-violet-600',
    accentSoft: 'bg-violet-50 text-violet-700 border-violet-200',
    ring: 'ring-violet-300',
    subcategories: [
      { id: 'ng-1-syllable', label: '1 Syllable', words: ['king', 'bang', 'tongue', 'sing', 'long', 'hang', 'thing', 'strong', 'rung', 'swing', 'lung', 'sting', 'song', 'wing', 'ring', 'wrong', 'spring', 'ping pong'] },
      { id: 'ng-2-syllable', label: '2 Syllable', words: ['sleeping', 'swimming', 'blowing', 'eating', 'drinking', 'stirring', 'kicking', 'singing', 'jumping', 'sweeping', 'brushing', 'waking', 'crying', 'waving', 'reading', 'swinging', 'running', 'sitting', 'raising', 'cutting'] },
    ],
  },
  {
    id: 'f',
    label: '/f/',
    accent: 'from-cyan-500 to-cyan-600',
    accentSoft: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    ring: 'ring-cyan-300',
    disabled: false,
    subcategories: [
      { id: 'f-initial', label: 'Initial', words: ['foot', 'fish', 'four', 'five', 'fan', 'fox', 'fin', 'fork', 'fence', 'food', 'fall', 'feet', 'first', 'phone', 'find', 'fire', 'family', 'forest', 'finger', 'feather'] },
      { id: 'f-medial', label: 'Medial', words: ['goofy', 'muffin', 'coughing', 'laughing', 'different', 'coffee', 'before', 'after', 'traffic', 'trophy', 'office', 'surfer', 'gopher', 'waffle', 'lifeguard', 'headphones', 'breakfast', 'alphabet', 'elephant', 'campfire'] },
      { id: 'f-final', label: 'Final', words: ['leaf', 'knife', 'giraffe', 'half', 'roof', 'shelf', 'wolf', 'surf', 'scarf', 'calf', 'elf', 'loaf', 'safe', 'golf', 'off', 'cough', 'laugh', 'stuff', 'chef', 'hoof'] },
    ],
  },
  {
    id: 'v',
    label: '/v/',
    accent: 'from-sky-500 to-sky-600',
    accentSoft: 'bg-sky-50 text-sky-700 border-sky-200',
    ring: 'ring-sky-300',
    disabled: false,
    subcategories: [
      { id: 'v-initial', label: 'Initial', words: ['v', 'vanilla', 'vegetable', 'violin', 'vase', 'vet', 'van', 'volcano', 'vacuum', 'vest', 'voice', 'vampire', 'volleyball', 'vitamins', 'velcro', 'vowel', 'vulture', 'vine', 'vote', 'valentine'] },
      { id: 'v-medial', label: 'Medial', words: ['shovel', 'fever', 'oval', 'seven', 'oven', 'beaver', 'heavy', 'wavy', 'gravy', 'clover', 'diver', 'driver', 'lava', 'travel', 'movie', 'over', 'river', 'never', 'invite', 'server'] },
      { id: 'v-final', label: 'Final', words: ['love', 'five', 'wave', 'stove', 'drive', 'shave', 'dive', 'move', 'cave', 'hive', 'give', 'wave', 'dove', 'carve', 'glove', 'leave', 'oliver', 'sleeve', 'above', 'microwave'] },
    ],
  },
  {
    id: 't',
    label: '/t/',
    accent: 'from-purple-500 to-purple-600',
    accentSoft: 'bg-purple-50 text-purple-700 border-purple-200',
    ring: 'ring-purple-300',
    disabled: false,
    subcategories: [
      { id: 't-final', label: 'Final', words: ['cat', 'boat', 'foot', 'coat', 'cat', 'sit', 'cut', 'hot', 'wet', 'eat', 'bat', 'pet', 'kite', 'net', 'pot'], },
  ],
  },
  {
    id: 'd',
    label: '/d/',
    accent: 'from-fuchsia-500 to-fuchsia-600',
    accentSoft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    ring: 'ring-fuchsia-300',
    disabled: false,
    subcategories: [
      { id: 'd-final', label: 'Final', words: ['bed', 'sad', 'dad', 'mad', 'red', 'mud', 'food', 'bird', 'hide', 'good', 'loud', 'slide', 'kid', 'read', 'lid'], },
  ],
  },
  {
    id: 'n',
    label: '/n/',
    accent: 'from-pink-500 to-pink-600',
    accentSoft: 'bg-pink-50 text-pink-700 border-pink-200',
    ring: 'ring-pink-300',
    disabled: true,
    subcategories: [
      { id: 'n-initial', label: 'Initial', words: [] },
      { id: 'n-medial', label: 'Medial', words: [] },
      { id: 'n-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'p',
    label: '/p/',
    accent: 'from-rose-500 to-orange-500',
    accentSoft: 'bg-orange-50 text-rose-700 border-orange-200',
    ring: 'ring-orange-300',
    disabled: true,
    subcategories: [
      { id: 'p-initial', label: 'Initial', words: [] },
      { id: 'p-medial', label: 'Medial', words: [] },
      { id: 'p-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'b',
    label: '/b/',
    accent: 'from-teal-400 to-sky-500',
    accentSoft: 'bg-sky-50 text-teal-700 border-sky-200',
    ring: 'ring-sky-300',
    disabled: true,
    subcategories: [
      { id: 'b-initial', label: 'Initial', words: [] },
      { id: 'b-medial', label: 'Medial', words: [] },
      { id: 'b-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'm',
    label: '/m/',
    accent: 'from-purple-600 to-pink-500',
    accentSoft: 'bg-pink-50 text-purple-700 border-pink-200',
    ring: 'ring-purple-300',
    disabled: true,
    subcategories: [
      { id: 'm-initial', label: 'Initial', words: [] },
      { id: 'm-medial', label: 'Medial', words: [] },
      { id: 'm-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'h',
    label: '/h/',
    accent: 'from-stone-500 to-stone-600',
    accentSoft: 'bg-stone-50 text-stone-700 border-stone-200',
    ring: 'ring-stone-300',
    disabled: true,
    subcategories: [
      { id: 'h-initial', label: 'Initial', words: [] },
      { id: 'h-medial', label: 'Medial', words: [] },
      { id: 'h-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'w',
    label: '/w/',
    accent: 'from-slate-500 to-slate-600',
    accentSoft: 'bg-slate-50 text-slate-700 border-slate-200',
    ring: 'ring-slate-300',
    disabled: true,
    subcategories: [
      { id: 'w-initial', label: 'Initial', words: [] },
      { id: 'w-medial', label: 'Medial', words: [] },
      { id: 'w-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'y',
    label: '/y/',
    accent: 'from-rose-500 to-rose-600',
    accentSoft: 'bg-rose-50 text-rose-700 border-rose-200',
    ring: 'ring-rose-300',
    disabled: true,
    subcategories: [
      { id: 'y-initial', label: 'Initial', words: [] },
      { id: 'y-medial', label: 'Medial', words: [] },
      { id: 'y-final', label: 'Final', words: [] },
    ],
  },
  {
    id: 'picture-scenes',
    label: 'Picture Scenes',
    kind: 'scene',
    accent: 'from-orange-400 to-amber-500',
    accentSoft: 'bg-orange-50 text-orange-700 border-orange-200',
    ring: 'ring-orange-300',
    subcategories: [{ id: SCENES_SUB_ID, label: 'All Scenes', words: SCENE_TITLES }],
  },
];

export function slugifyWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ------------------------------- language mode ------------------------------ */

export type Mode = 'speech' | 'language' | 'Ready-Play-Speech';

export const languageCategories: SoundCategory[] = [
  {
    id: 'pronouns',
    label: 'Pronouns',
    kind: 'language',
    accent: 'from-pink-500 to-rose-600',
    accentSoft: 'bg-pink-50 text-pink-700 border-pink-200',
    ring: 'ring-pink-300',
    subcategories: [
      { id: 'pronouns-he', label: 'he / his', words: ['he is eating', 'he is swimming', 'he is hugging a dog', 'he is having a birthday', 'he is playing guitar', 'he is playing in water', 'he is playing doctor', 'he is painting', 'he is skating', 'he is washing', 'he is building', 'he is playing soccer', 'he is writing', 'he is reading', 'he is playing', 'he is skateboarding', 'he is baking', 'he is making a sandcastle', 'he is wearing a lifejacket', 'he is making a snowman'] },
      { id: 'pronouns-she', label: 'she / her', words: ['she is skating', 'she is playing guitar', 'she is having a birthday', 'she is dirty', 'she is playing doctor', 'she is washing', 'she is holding a dog', 'she is swimming', 'she is building', 'she is playing soccer', 'she is writing', 'she is reading', 'she is eating', 'she is playing', 'she is sitting', 'she is baking', 'she is painting', 'she is building a sandcastle', 'she is hugging', 'she is wearing a lifejacket'] },
      { id: 'pronouns-they', label: 'they / their', words: ['they are building', 'they are celebrating', 'they are making music', 'they are playing outside', 'they are playing doctor', 'they are painting', 'they are skating', 'they are paddling', 'they are washing', 'they are smiling', 'they are swimming', 'they are writing', 'they are reading', 'they are eating', 'they are playing soccer', 'they are playing', 'they are skateboarding', 'they are baking', 'they are making a sandcastle', 'they are making a snowman'] },
    ],
  },
  {
    id: 'verbs',
    label: 'Verbs',
    kind: 'language',
    accent: 'from-emerald-500 to-teal-600',
    accentSoft: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ring: 'ring-emerald-300',
    subcategories: [
    //  { id: 'verbs-progressive', label: 'Present Progressive', words: ['sleeping', 'swimming', 'blowing', 'eating', 'drinking', 'stirring', 'kicking', 'singing', 'jumping', 'sweeping', 'brushing', 'waking', 'crying', 'waving', 'reading', 'swinging', 'running', 'sitting', 'raising', 'cutting'] },
    //  { id: 'verbs-3rd-person', label: '3rd Person Singular', words: ['sleeping', 'swimming', 'blowing', 'eating', 'drinking', 'stirring', 'kicking', 'singing', 'jumping', 'sweeping', 'brushing', 'waking', 'crying', 'waving', 'reading', 'swinging', 'running', 'sitting', 'raising', 'cutting'] },
      {
        id: 'verbs-regular-past',
        label: 'Regular Past Tense',
        groups: [
          { id: 'verbs-regular-past-t', label: '/t/', words: ['cracked', 'jumped', 'kicked', 'helped', 'fixed', 'dropped', 'asked', 'attacked', 'picked', 'baked', 'licked', 'barked', 'clapped', 'cooked', 'escaped', 'locked', 'packed', 'shocked', 'peeked', 'skipped', 'snapped', 'zipped', 'walked'] },
          { id: 'verbs-regular-past-d', label: '/d/', words: [] },
          { id: 'verbs-regular-past-ed', label: '/ed/', words: [] },
        ],
      },
            {
        id: 'verbs-irregular-past',
        label: 'Irregular Past Tense',
        groups: [
          { id: 'verbs-irregular-past-early', label: 'Early (3-4yrs)', words: ['ate', 'said', 'did', 'saw', 'came', 'went', 'gave', 'took', 'fell', 'made', 'got', 'broke', 'put', 'cut', 'would'] },
          { id: 'verbs-irregular-past-mid', label: 'Mid (4-6yrs)', words: ['rode', 'sang', 'heard', 'wrote', 'drew', 'swam', 'bought', 'drank', 'flew', 'built', 'found', 'began', 'sold', 'drove', 'knew', 'caught', 'became', 'taught', 'brought', 'bit', 'blew', 'forgot', 'lost', 'paid', 'told', 'spoke', 'rang', 'held', 'left', 'thought', 'threw', 'slept', 'woke', 'hid', 'fought', 'swung', 'dug', 'fed', 'met', 'stole'] },
          { id: 'verbs-irregular-past-later', label: 'Later (6-8+yrs)', words: ['bound', 'struck', 'tore', 'stood', 'misled', 'stung', 'understood', 'sank', 'shook', 'froze', 'bled', 'spun', 'shut', 'hurt'] },
        ],
      },
    ],
  },
  {
    id: 'plurals',
    label: 'Plurals',
    kind: 'language',
    accent: 'from-amber-500 to-orange-600',
    accentSoft: 'bg-amber-50 text-amber-700 border-amber-200',
    ring: 'ring-amber-300',
    subcategories: [
      { id: 'plurals-es', label: '-es', words: ['boxes', 'dishes', 'foxes', 'buses', 'watches', 'dresses', 'bushes', 'witches', 'brushes', 'sandwiches', 'matches', 'mailboxes', 'couches', 'houses', 'horses', 'glasses', 'peaches', 'axes', 'leashes', 'lunches'] },
      { id: 'plurals-ves', label: '-ves', words: ['wolves', 'knives', 'leaves', 'loaves', 'shelves', 'calves', 'halves', 'scarves', 'elves', 'hooves'] },
      { id: 'plurals-irregular', label: 'Irregular', words: ['feet', 'teeth', 'geese', 'people', 'mice', 'children', 'fish', 'sheep', 'moose', 'deer', 'women', 'men'] },
    ],
  },
    {
    id: 'prepositions',
    label: 'Basic Concepts',
    kind: 'language',
    accent: 'from-sky-500 to-blue-600',
    accentSoft: 'bg-sky-50 text-sky-700 border-sky-200',
    ring: 'ring-sky-300',
    subcategories: [
      { id: 'concepts-spatial', label: 'Spatial', words: ['in', 'on', 'under', 'behind', 'in front', 'next to'] },
      { id: 'concepts-temporal', label: 'Temporal', words: ['before', 'after', 'first', 'next', 'last', 'start', 'finish', 'day', 'night', 'winter', 'summer', 'spring', 'fall'] },
      { id: 'concepts-qualitative', label: 'Qualitative', words: ['big', 'little', 'hot', 'cold', 'hard', 'soft', 'same', 'different'] },
      { id: 'concepts-quantitative', label: 'Quantitative', words: ['more', 'less', 'empty', 'full', 'all', 'none', 'some', 'many', 'few'] },
    ],
  },
  {
    id: 'phonological-awareness',
    label: 'Phonological Awareness',
    kind: 'language',
    accent: 'from-teal-500 to-emerald-600',
    accentSoft: 'bg-teal-50 text-teal-700 border-teal-200',
    ring: 'ring-teal-300',
    subcategories: [
      { id: 'pa-rhyming', label: 'Rhyming', words: ['cat / hat', 'dog / log', 'sun / run', 'star / car', 'cake / lake', 'mouse / house', 'bee / tree', 'goat / boat', 'snail / whale', 'frog / log'] },
      { id: 'pa-syllables', label: 'Syllables', words: ['cat (1)', 'rabbit (2)', 'banana (3)', 'elephant (3)', 'sunshine (2)', 'butterfly (3)', 'pizza (2)', 'dinosaur (3)', 'umbrella (3)', 'apple (2)'] },
      { id: 'pa-initial-sounds', label: 'First Sound', words: ['ball /b/', 'cat /k/', 'dog /d/', 'fish /f/', 'goat /g/', 'hat /h/', 'jet /j/', 'kite /k/', 'lion /l/', 'mouse /m/'] },
      { id: 'pa-final-sounds', label: 'Last Sound', words: ['cat /t/', 'dog /g/', 'bus /s/', 'map /p/', 'bed /d/', 'fan /n/', 'cup /p/', 'wig /g/', 'ham /m/', 'roof /f/'] },
      { id: 'pa-blending', label: 'Blending', words: ['c-a-t → cat', 'd-o-g → dog', 's-u-n → sun', 'p-i-g → pig', 'h-a-t → hat', 'b-e-d → bed', 'm-a-p → map', 'r-u-n → run', 'f-o-x → fox', 'c-u-p → cup'] },
      { id: 'pa-segmenting', label: 'Segmenting', words: ['cat → c-a-t', 'dog → d-o-g', 'sun → s-u-n', 'pig → p-i-g', 'hat → h-a-t', 'bed → b-e-d', 'map → m-a-p', 'run → r-u-n', 'fox → f-o-x', 'cup → c-u-p'] },
    ],
  },
  {
    id: 'following-directions',
    label: 'Following Directions',
    kind: 'language',
    accent: 'from-violet-500 to-purple-600',
    accentSoft: 'bg-violet-50 text-violet-700 border-violet-200',
    ring: 'ring-violet-300',
    subcategories: [],
  },
  ];

export function categoryListFor(mode: Mode): SoundCategory[] {
  return mode === 'language' ? languageCategories : categories;
}

/** Display order for speech sound categories in the main filter bar. */
export const SPEECH_CATEGORY_DISPLAY_ORDER = [
  'th', 'r', 's', 'z', 'l', 'sh', 'ch', 'j', 'f', 'v', 'k', 'g', 'ng',
];

/** Early sounds shown in a collapsible row toggled by the Early Sounds button. */
export const EARLY_SOUNDS_ORDER = ['t', 'd', 'n', 'y', 'w', 'h', 'p', 'b', 'm'];

/** Return speech categories in the display order required by the filter bar. */
export function orderedSpeechCategories(): SoundCategory[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered: SoundCategory[] = [];
  for (const id of SPEECH_CATEGORY_DISPLAY_ORDER) {
    const c = byId.get(id);
    if (c) ordered.push(c);
  }
  // Append any categories not in the explicit order list (e.g. picture-scenes)
  for (const c of categories) {
    if (!ordered.includes(c)) ordered.push(c);
  }
  return ordered;
}

/** Return the early-sounds categories in display order. */
export function earlySoundsCategories(): SoundCategory[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return EARLY_SOUNDS_ORDER.map((id) => byId.get(id)).filter((c): c is SoundCategory => Boolean(c));
}

/** Display order for mixed-practice picker groups. */
export const MIXED_PRACTICE_ORDER = [
  'th', 'r-initial-picker', 'r-blends-picker', 'vocalic-r-picker',
  's', 'z', 's-blends',
  'l', 'l-blends-picker',
  'sh', 'ch', 'j', 'f', 'v', 'k', 'g', 'ng',
];

/** Early-sounds categories shown after a horizontal divider in mixed practice. */
export const MIXED_PRACTICE_EARLY_SOUNDS_ORDER = [
  't', 'd', 'n', 'y', 'w', 'h', 'p', 'b', 'm',
];

export function imageFor(word: string): string {
  return `/images/${slugifyWord(word)}.png`;
}

export function findCategory(id: string): SoundCategory | undefined {
  return categories.find((c) => c.id === id) ?? languageCategories.find((c) => c.id === id);
}

export function findSubcategory(category: SoundCategory, subId: string): Subcategory | undefined {
  return category.subcategories.find((s) => s.id === subId);
}

export function getWordList(sub: Subcategory | undefined, groupId: string | null): string[] {
  if (!sub) return [];
  if (sub.words) return sub.words;
  if (sub.groups) {
    const g = sub.groups.find((g) => g.id === groupId);
    return g?.words ?? [];
  }
  return [];
}

/** Flatten every selectable word-source (subcategory + optional group) into a flat list. */
export type SelectableSource = {
  categoryId: string;
  categoryLabel: string;
  subId: string;
  subLabel: string;
  groupId: string | null;
  groupLabel: string | null;
  words: string[];
  accent: string;
  accentSoft: string;
};

export function allSelectableSources(mode: Mode = 'speech'): SelectableSource[] {
  const sources: SelectableSource[] = [];
  for (const c of categoryListFor(mode)) {
    if (c.kind === 'scene') continue;
    if (c.disabled) continue;
    for (const s of c.subcategories) {
      if (s.words) {
        sources.push({
          categoryId: c.id,
          categoryLabel: c.label,
          subId: s.id,
          subLabel: s.label,
          groupId: null,
          groupLabel: null,
          words: s.words,
          accent: c.accent,
          accentSoft: c.accentSoft,
        });
      } else if (s.groups) {
        for (const g of s.groups) {
          sources.push({
            categoryId: c.id,
            categoryLabel: c.label,
            subId: s.id,
            subLabel: s.label,
            groupId: g.id,
            groupLabel: g.label,
            words: g.words,
            accent: c.accent,
            accentSoft: c.accentSoft,
          });
        }
      }
    }
  }
  return sources;
}

export function sourceKey(s: Pick<SelectableSource, 'subId' | 'groupId'>): string {
  return s.groupId ? `${s.subId}::${s.groupId}` : s.subId;
}

/**
 * Build a human-readable display label for a selected category path.
 *
 * Rules:
 * - /l/ blends, /r/ blends, /s/ Blends → just the blend (e.g. "/pl/", "/gr/")
 * - /r/ medial or final → "medial /ear/" (no /r/ prefix)
 * - /th/ → just the sub-most label (e.g. "/thr/", "θ Final")
 * - /w/ + /r/ or /rl/ → just that label
 * - everything else → "{category} {subcategory}" (e.g. "/l/ medial", "/s/ final")
 */
export function displayLabel(
  categoryId: string,
  subId: string,
  groupId: string | null,
): string {
  const cat = findCategory(categoryId);
  if (!cat) return categoryId ? subId : '';
  const sub = findSubcategory(cat, subId);
  if (!sub) return cat.label;

  const group = sub.groups && groupId ? sub.groups.find((g) => g.id === groupId) : undefined;

  // Blends: just show the blend label
  if (cat.id === 'r-blends' || cat.id === 'l-blends' || sub.id === 'r-blends' || sub.id === 'l-blends') {
    return group?.label ?? sub.label;
  }

  // /s/ blends: just show the blend (e.g. "/st/")
  if (cat.id === 's' && sub.id === 's-blends') {
    return group?.label ?? sub.label;
  }

  // /r/ medial or final: "medial /ear/" (no /r/ prefix)
  if (cat.id === 'r' && (sub.id === 'r-medial' || sub.id === 'r-final')) {
    if (group) return `${sub.label.toLowerCase()} ${group.label}`;
    return sub.label;
  }

  // /th/: just the sub-most label
  if (cat.id === 'th') {
    return group?.label ?? sub.label;
  }

  // Language categories: drop the category name, show only the subcategory
  if (cat.kind === 'language') {
    // Basic Concepts: "Spatial" → "Spatial Concepts"
    if (cat.id === 'prepositions') return `${sub.label} Concepts`;
    return sub.label;
  }

  // /w/ + /r/ or /rl/: just that label
  if (group && (group.id === 'r-medial-wr' || group.id === 'r-final-rl')) {
    return group.label;
  }

  // Default: "{category} {subcategory}"
  if (group) return `${cat.label} ${sub.label.toLowerCase()} ${group.label}`;
  return `${cat.label} ${sub.label.toLowerCase()}`;
}
