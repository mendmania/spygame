/**
 * Spyfall Category Packs
 * 
 * Built-in category packs for different game modes.
 * The "locations" category uses the classic SPY_LOCATIONS.
 * Other categories provide alternative themes.
 */

import type { SpyfallLocation, SpyfallCategory, SpyfallCategoryPack } from '@vbz/shared-types';
import { SPY_LOCATIONS } from './locations';

/**
 * Animals Category Pack
 * Players try to identify which animal the spy doesn't know
 */
export const ANIMAL_ITEMS: SpyfallLocation[] = [
  { name: "Lion", roles: [] },
  { name: "Elephant", roles: [] },
  { name: "Dolphin", roles: [] },
  { name: "Eagle", roles: [] },
  { name: "Wolf", roles: [] },
  { name: "Penguin", roles: [] },
  { name: "Tiger", roles: [] },
  { name: "Owl", roles: [] },
  { name: "Bear", roles: [] },
  { name: "Shark", roles: [] },
  { name: "Monkey", roles: [] },
  { name: "Butterfly", roles: [] },
  { name: "Crocodile", roles: [] },
  { name: "Giraffe", roles: [] },
  { name: "Kangaroo", roles: [] },
  { name: "Octopus", roles: [] },
  { name: "Parrot", roles: [] },
  { name: "Horse", roles: [] },
  { name: "Rabbit", roles: [] },
  { name: "Fox", roles: [] },
];

/**
 * Food Category Pack
 * Players try to identify which food the spy doesn't know
 */
export const FOOD_ITEMS: SpyfallLocation[] = [
  { name: "Pizza", roles: ["Dough Tosser", "Topping Master", "Oven Specialist"] },
  { name: "Sushi", roles: ["Rice Expert", "Fish Slicer", "Roll Artist"] },
  { name: "Burger", roles: ["Patty Flipper", "Bun Toaster", "Sauce Master"] },
  { name: "Ice Cream", roles: ["Scoop Artist", "Cone Holder", "Topping Sprinkler"] },
  { name: "Pasta", roles: ["Noodle Maker", "Sauce Stirrer", "Cheese Grater"] },
  { name: "Tacos", roles: ["Shell Expert", "Meat Seasoner", "Salsa Maker"] },
  { name: "Ramen", roles: ["Broth Master", "Noodle Expert", "Egg Timer"] },
  { name: "Cake", roles: ["Baker", "Frosting Artist", "Candle Lighter"] },
  { name: "Salad", roles: ["Lettuce Chopper", "Dressing Mixer", "Veggie Arranger"] },
  { name: "Steak", roles: ["Grill Master", "Temperature Checker", "Seasoning Expert"] },
  { name: "Chocolate", roles: ["Cocoa Sourcer", "Mold Filler", "Taste Tester"] },
  { name: "Soup", roles: ["Stock Maker", "Ingredient Chopper", "Heat Regulator"] },
  { name: "Sandwich", roles: ["Bread Slicer", "Layer Builder", "Press Operator"] },
  { name: "Coffee", roles: ["Bean Roaster", "Barista", "Latte Artist"] },
  { name: "Dim Sum", roles: ["Dumpling Folder", "Steamer Watcher", "Cart Pusher"] },
  { name: "Pancakes", roles: ["Batter Mixer", "Flipper", "Syrup Pourer"] },
  { name: "Curry", roles: ["Spice Blender", "Rice Cooker", "Heat Controller"] },
  { name: "Donut", roles: ["Dough Shaper", "Fryer", "Glaze Dipper"] },
  { name: "Smoothie", roles: ["Fruit Picker", "Blender Operator", "Garnish Expert"] },
  { name: "Cheese", roles: ["Milk Curator", "Aging Expert", "Wheel Turner"] },
];





/**
 * Sports Category Pack
 * Players try to identify which sport the spy doesn't know
 */
export const SPORTS_ITEMS: SpyfallLocation[] = [
  { name: "Soccer", roles: ["Goalkeeper", "Striker", "Referee"] },
  { name: "Basketball", roles: ["Point Guard", "Center", "Coach"] },
  { name: "Tennis", roles: ["Server", "Receiver", "Line Judge"] },
  { name: "Swimming", roles: ["Freestyle Swimmer", "Diver", "Lifeguard"] },
  { name: "Golf", roles: ["Golfer", "Caddy", "Course Marshal"] },
  { name: "Baseball", roles: ["Pitcher", "Batter", "Umpire"] },
  { name: "Ice Hockey", roles: ["Goalie", "Forward", "Zamboni Driver"] },
  { name: "Boxing", roles: ["Fighter", "Trainer", "Ring Announcer"] },
  { name: "Gymnastics", roles: ["Gymnast", "Judge", "Spotter"] },
  { name: "Cycling", roles: ["Rider", "Team Director", "Mechanic"] },
  { name: "Skiing", roles: ["Skier", "Ski Patrol", "Lift Operator"] },
  { name: "Volleyball", roles: ["Setter", "Spiker", "Libero"] },
  { name: "Rugby", roles: ["Scrum Half", "Fullback", "Referee"] },
  { name: "Cricket", roles: ["Batsman", "Bowler", "Wicket Keeper"] },
  { name: "Surfing", roles: ["Surfer", "Judge", "Beach Patrol"] },
  { name: "Wrestling", roles: ["Wrestler", "Referee", "Manager"] },
  { name: "Archery", roles: ["Archer", "Target Setter", "Equipment Manager"] },
  { name: "Fencing", roles: ["Fencer", "Director", "Armorer"] },
  { name: "Marathon", roles: ["Runner", "Pace Setter", "Water Station Volunteer"] },
  { name: "Skateboarding", roles: ["Skater", "Judge", "Park Designer"] },
];

/**
 * All category packs configuration
 */
export const CATEGORY_PACKS: Record<SpyfallCategory, SpyfallCategoryPack> = {
  locations: {
    id: 'locations',
    name: 'Locations',
    description: 'The original Spyfall experience with 40+ locations',
    emoji: '🏢',
    items: SPY_LOCATIONS,
    isPremium: false,
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    description: 'Identify animals from the animal kingdom',
    emoji: '🐾',
    items: ANIMAL_ITEMS,
    isPremium: false,
  },
  foods: {
    id: 'foods',
    name: 'Foods',
    description: 'Discover delicious dishes from around the world',
    emoji: '🍕',
    items: FOOD_ITEMS,
    isPremium: false,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own category with custom items',
    emoji: '✨',
    items: [],
    isPremium: true,
  },
};

/**
 * Get all available categories (both free and premium)
 */
export function getAllCategories(): SpyfallCategoryPack[] {
  return Object.values(CATEGORY_PACKS);
}

/**
 * Get free categories only
 */
export function getFreeCategories(): SpyfallCategoryPack[] {
  return Object.values(CATEGORY_PACKS).filter(c => !c.isPremium);
}

/**
 * Get a specific category pack
 */
export function getCategoryPack(category: SpyfallCategory): SpyfallCategoryPack {
  return CATEGORY_PACKS[category];
}

/**
 * Get items for a specific category
 */
export function getCategoryItems(category: SpyfallCategory): SpyfallLocation[] {
  return CATEGORY_PACKS[category]?.items || [];
}
