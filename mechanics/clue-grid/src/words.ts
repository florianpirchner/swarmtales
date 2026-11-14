// SPDX-License-Identifier: Apache-2.0
/** The word pool of Lanterns, carried as it stands: the grid stream draws from it, so its order is part of every recorded game. */

/**
 * The word pool: concrete, common English nouns, written for this game. No word holds another word of the
 * pool (`horn` and `thorn` are not both in it), so the clue check never trips over two grid words.
 *
 * @public
 */
export const WORD_POOL: readonly string[] = [
	"acorn", "anchor", "apple", "arrow", "attic", "badge", "bakery", "balloon", "bamboo", "banner", "barrel", "basket", "beacon", "beetle", "bell",
	"bishop", "blanket", "boot", "bottle", "bracelet", "bridge", "broom", "brush", "bucket", "button", "cabin", "cactus", "camel", "candle", "canoe",
	"canyon", "carpet", "carrot", "castle", "cellar", "chain", "chalk", "cherry", "chimney", "circus", "cliff", "cloak", "clock", "cloud", "cobweb",
	"coin", "comet", "compass", "copper", "coral", "cotton", "crane", "crater", "cricket", "crown", "crystal", "curtain", "dagger", "desert", "diamond",
	"dice", "dolphin", "dragon", "drum", "dune", "eagle", "ember", "engine", "envelope", "falcon", "fang", "feather", "fence", "fern", "ferry",
	"fiddle", "flag", "flame", "flute", "forest", "fossil", "fountain", "fox", "frost", "funnel", "garden", "garlic", "gear", "ghost", "glacier",
	"glove", "goat", "goblet", "granite", "grape", "gravel", "hammer", "harbor", "harp", "hedge", "helmet", "hive", "honey", "hook", "horn",
	"hourglass", "igloo", "island", "ivory", "jacket", "jar", "jelly", "jungle", "kernel", "kettle", "kite", "knight", "ladder", "lagoon", "lantern",
	"leash", "lemon", "library", "lighthouse", "lizard", "lobster", "locket", "loom", "magnet", "mango", "marble", "market", "mask", "maze", "meadow",
	"mirror", "mitten", "monkey", "moon", "moth", "mountain", "mushroom", "nectar", "needle", "nest", "oasis", "ocean", "olive", "orbit", "orchard",
	"otter", "owl", "paddle", "paint", "palace", "parade", "parrot", "pearl", "pebble", "pencil", "pepper", "piano", "pillow", "pilot", "pine",
	"pirate", "planet", "plank", "plum", "pocket", "pond", "potato", "prism", "pumpkin", "puzzle", "pyramid", "quilt", "quiver", "rabbit", "radio",
	"raft", "raven", "reef", "ribbon", "riddle", "river", "robot", "rocket", "rope", "rudder", "saddle", "sail", "salmon", "satellite", "scale",
	"scarf", "scroll", "seed", "shark", "shell", "shield", "ship", "shovel", "silk", "skull", "sled", "snail", "snow", "soap", "spider",
	"sponge", "spoon", "sprout", "squirrel", "stamp", "statue", "storm", "sugar", "swamp", "sword", "table", "temple", "thimble", "thunder", "tide",
	"tiger", "timber", "tomato", "torch", "tower", "tractor", "trolley", "trumpet", "tulip", "tunnel", "turtle", "umbrella", "valley", "vase", "velvet",
	"vine", "violin", "volcano", "wagon", "walnut", "wax", "whale", "wheel", "whistle", "willow", "window", "wizard", "wolf", "wool", "wreath", "yacht",
	"yarn", "zebra",
];
