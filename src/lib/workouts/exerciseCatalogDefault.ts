import type { ExerciseCatalogEntry } from './types';


/**
 * Built-in workout types (exercises) for the logger picker and vault catalog seed.
 * Re-exported from `settings.ts` as the canonical default list.
 */
export const DEFAULT_WORKOUT_TYPES: ExerciseCatalogEntry[] = [
  // Chest
  {
    name: 'Bench press',
    muscleGroup: 'Chest',
    aliases: ['bench', 'flat bench', 'barbell bench', 'press on flat bench'],
  },
  {
    name: 'Incline bench press',
    muscleGroup: 'Chest',
    aliases: ['incline barbell bench', 'incline bench', 'angled barbell press'],
  },
  {
    name: 'Incline dumbbell press',
    muscleGroup: 'Chest',
    aliases: ['incline dumbbells', 'angled dumbbell press', 'incline db press'],
  },
  {
    name: 'Dumbbell fly',
    muscleGroup: 'Chest',
    aliases: ['chest fly', 'dumbbell flye', 'pec fly dumbbells'],
  },
  {
    name: 'Cable crossover',
    muscleGroup: 'Chest',
    aliases: ['cable fly', 'cable chest fly', 'crossover machine'],
  },
  {
    name: 'Push-up',
    muscleGroup: 'Chest',
    aliases: ['pushup', 'press up', 'floor push ups'],
  },
  {
    name: 'Dips',
    muscleGroup: 'Chest',
    aliases: ['chest dips', 'parallel bar dips', 'tricep dips leaning forward'],
  },
  {
    name: 'Machine chest press',
    muscleGroup: 'Chest',
    aliases: ['chest press machine', 'seated chest press', 'hammer strength chest'],
  },

  // Back
  {
    name: 'Wide-grip pull-up',
    muscleGroup: 'Back',
    aliases: ['pull up wide grip', 'wide pullup', 'chin up wide grip'],
  },
  {
    name: 'Pull-up',
    muscleGroup: 'Back',
    aliases: ['pullup', 'chin up', 'bodyweight pull up'],
  },
  {
    name: 'Lat pulldown',
    muscleGroup: 'Back',
    aliases: ['pulldown', 'lat pull cable', 'pull bar down seated'],
  },
  {
    name: 'Barbell row',
    muscleGroup: 'Back',
    aliases: ['bent over row', 'row barbell', 'pendlay row'],
  },
  {
    name: 'Dumbbell row',
    muscleGroup: 'Back',
    aliases: ['single arm row', 'one arm dumbbell row', 'db row'],
  },
  {
    name: 'Seated cable row',
    muscleGroup: 'Back',
    aliases: ['cable row seated', 'low row machine', 'v-bar row'],
  },
  {
    name: 'T-bar row',
    muscleGroup: 'Back',
    aliases: ['t bar row', 'landmine row', 'chest supported t bar'],
  },
  {
    name: 'Deadlift',
    muscleGroup: 'Back',
    aliases: ['conventional deadlift', 'barbell deadlift', 'pull bar from floor'],
  },
  {
    name: 'Face pull',
    muscleGroup: 'Back',
    aliases: ['cable face pull', 'rear delt pull rope', 'pull rope to face'],
  },

  // Shoulders
  {
    name: 'Overhead press',
    muscleGroup: 'Shoulders',
    aliases: ['military press', 'standing press', 'barbell ohp'],
  },
  {
    name: 'Single-arm overhead press',
    muscleGroup: 'Shoulders',
    aliases: ['one arm press', 'dumbbell ohp single arm', 'press dumbbell overhead one arm'],
  },
  {
    name: 'Dumbbell shoulder press',
    muscleGroup: 'Shoulders',
    aliases: ['seated dumbbell press', 'db shoulder press', 'dumbbell ohp'],
  },
  {
    name: 'Dumbbell lateral raise',
    muscleGroup: 'Shoulders',
    aliases: ['lateral raise', 'side raise', 'raise dumbbells to sides'],
  },
  {
    name: 'Front raise',
    muscleGroup: 'Shoulders',
    aliases: ['dumbbell front raise', 'plate front raise', 'raise weight in front'],
  },
  {
    name: 'Reverse fly',
    muscleGroup: 'Shoulders',
    aliases: ['rear delt fly', 'bent over reverse fly', 'dumbbell rear delt'],
  },
  {
    name: 'Arnold press',
    muscleGroup: 'Shoulders',
    aliases: ['rotating dumbbell press', 'arnold dumbbell press'],
  },
  {
    name: 'Upright row',
    muscleGroup: 'Shoulders',
    aliases: ['barbell upright row', 'cable upright row', 'pull bar to chin'],
  },

  // Biceps
  {
    name: 'Dumbbell bicep curl',
    muscleGroup: 'Biceps',
    aliases: ['bicep curl', 'curl dumbbells', 'standing dumbbell curl'],
  },
  {
    name: 'Barbell curl',
    muscleGroup: 'Biceps',
    aliases: ['straight bar curl', 'bb curl', 'curl barbell standing'],
  },
  {
    name: 'Incline dumbbell curl',
    muscleGroup: 'Biceps',
    aliases: ['incline curl', 'curl on incline bench'],
  },
  {
    name: 'Hammer curl',
    muscleGroup: 'Biceps',
    aliases: ['neutral grip curl', 'hammer curls dumbbells'],
  },
  {
    name: 'Preacher curl',
    muscleGroup: 'Biceps',
    aliases: ['scott curl', 'preacher bench curl', 'ez bar preacher'],
  },
  {
    name: 'Cable curl',
    muscleGroup: 'Biceps',
    aliases: ['cable bicep curl', 'low pulley curl', 'rope hammer curl'],
  },

  // Triceps
  {
    name: 'Cable tricep pushdown',
    muscleGroup: 'Triceps',
    aliases: ['tricep pushdown', 'push cable down', 'straight bar pushdown'],
  },
  {
    name: 'Skull crusher',
    muscleGroup: 'Triceps',
    aliases: ['lying tricep extension', 'ez bar skullcrusher', 'french press'],
  },
  {
    name: 'Overhead tricep extension',
    muscleGroup: 'Triceps',
    aliases: ['dumbbell tricep extension overhead', 'single arm overhead extension'],
  },
  {
    name: 'Close-grip bench press',
    muscleGroup: 'Triceps',
    aliases: ['cgbp', 'narrow grip bench', 'close grip press'],
  },
  {
    name: 'Tricep dip',
    muscleGroup: 'Triceps',
    aliases: ['bench dip', 'parallel dips triceps', 'bodyweight tricep dip'],
  },
  {
    name: 'Kickback',
    muscleGroup: 'Triceps',
    aliases: ['tricep kickback', 'dumbbell kickback', 'cable kickback'],
  },

  // Legs
  {
    name: 'Back squat',
    muscleGroup: 'Legs',
    aliases: ['squat', 'barbell squat', 'high bar squat'],
  },
  {
    name: 'Front squat',
    muscleGroup: 'Legs',
    aliases: ['front barbell squat', 'squat bar on front shoulders'],
  },
  {
    name: 'Leg press',
    muscleGroup: 'Legs',
    aliases: ['sled leg press', 'press legs on machine', '45 degree leg press'],
  },
  {
    name: 'Romanian deadlift',
    muscleGroup: 'Legs',
    aliases: ['rdl', 'stiff leg deadlift', 'hinge and lower bar along legs'],
  },
  {
    name: 'Bulgarian split squat',
    muscleGroup: 'Legs',
    aliases: ['split squat rear foot elevated', 'bulgarian squat', 'rear foot elevated lunge'],
  },
  {
    name: 'Walking lunge',
    muscleGroup: 'Legs',
    aliases: ['lunges walking', 'dumbbell walking lunge', 'forward lunge steps'],
  },
  {
    name: 'Leg extension',
    muscleGroup: 'Legs',
    aliases: ['quad extension', 'leg extension machine', 'extend legs seated'],
  },
  {
    name: 'Seated leg curl',
    muscleGroup: 'Legs',
    aliases: ['leg curl machine', 'hamstring curl seated', 'curl legs under seat'],
  },
  {
    name: 'Lying leg curl',
    muscleGroup: 'Legs',
    aliases: ['prone leg curl', 'hamstring curl lying', 'face down leg curl'],
  },
  {
    name: 'Hip thrust',
    muscleGroup: 'Legs',
    aliases: ['barbell hip thrust', 'glute bridge weighted', 'thrust hips with bar'],
  },
  {
    name: 'Calf raise',
    muscleGroup: 'Legs',
    aliases: ['standing calf raise', 'seated calf raise', 'raise heels'],
  },
  {
    name: 'Goblet squat',
    muscleGroup: 'Legs',
    aliases: ['dumbbell goblet squat', 'kettlebell squat held at chest'],
  },
  {
    name: 'Hack squat',
    muscleGroup: 'Legs',
    aliases: ['hack squat machine', 'angled squat machine'],
  },

  // Core
  {
    name: 'Hanging leg raise',
    muscleGroup: 'Core',
    aliases: ['leg raise hanging', 'hanging abs', 'raise legs from bar'],
  },
  {
    name: 'Cable crunch',
    muscleGroup: 'Core',
    aliases: ['kneeling cable crunch', 'crunch on cable machine'],
  },
  {
    name: 'Plank',
    muscleGroup: 'Core',
    aliases: ['front plank', 'forearm plank', 'hold plank position'],
  },
  {
    name: 'Ab wheel rollout',
    muscleGroup: 'Core',
    aliases: ['ab rollout', 'wheel rollout', 'roll out on knees'],
  },
  {
    name: 'Russian twist',
    muscleGroup: 'Core',
    aliases: ['weighted russian twist', 'rotate torso seated', 'twist with plate'],
  },
  {
    name: 'Crunch',
    muscleGroup: 'Core',
    aliases: ['ab crunch', 'floor crunch', 'bicycle crunch'],
  },
  {
    name: 'Dead bug',
    muscleGroup: 'Core',
    aliases: ['alternating dead bug', 'opposite arm leg extension floor'],
  },
  {
    name: 'Side plank',
    muscleGroup: 'Core',
    aliases: ['lateral plank', 'oblique plank hold', 'side bridge'],
  },
];


/** Built-in seed catalog used when the vault markdown file is missing or empty. */
export const DEFAULT_EXERCISE_CATALOG_ENTRIES: ExerciseCatalogEntry[] = DEFAULT_WORKOUT_TYPES;

export const DEFAULT_MUSCLE_GROUP_BY_EXERCISE_NAME = new Map(
  DEFAULT_EXERCISE_CATALOG_ENTRIES.map((entry) => [entry.name.toLowerCase(), entry.muscleGroup]),
);
