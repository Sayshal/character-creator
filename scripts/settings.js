import { CustomCompendiums } from './app/CustomCompendiums.js';
import { HM } from './hero-mancer.js';
import { StatRoller } from './utils/index.js';

/**
 * Registers all the settings for the Hero Mancer module.
 * This function is the entry point for setting registration,
 * calling both module-specific and application-specific settings.
 */
export function registerSettings() {
  // Client-scoped: Enable or disable the module for individual users
  game.settings.register(HM.ID, 'enable', {
    name: `${HM.ABRV}.settings.enable.name`,
    default: true,
    type: Boolean,
    scope: 'client',
    config: true,
    hint: `${HM.ABRV}.settings.enable.hint`,
    requiresReload: true
  });

  // Client-scoped: Set the logging level for individual users
  game.settings.register(HM.ID, 'loggingLevel', {
    name: `${HM.ABRV}.settings.logger.name`,
    hint: `${HM.ABRV}.settings.logger.hint`,
    scope: 'client',
    config: true,
    type: String,
    choices: {
      0: `${HM.ABRV}.settings.logger.choices.off`,
      1: `${HM.ABRV}.settings.logger.choices.errors`,
      2: `${HM.ABRV}.settings.logger.choices.warnings`,
      3: `${HM.ABRV}.settings.logger.choices.verbose`
    },
    default: 2,
    onChange: (value) => {
      const logMessage = `${HM.ABRV}.settings.logger.level.${value}`;
      if (value !== '0') {
        HM.log(3, logMessage); // Log the current logging level unless it's Off
      }
    }
  });

  game.settings.register(HM.ID, 'deities', {
    name: 'Available Deities',
    hint: 'Comma-separated list of deities available for character creation',
    scope: 'world',
    config: true,
    type: String,
    default: 'None,Aphrodite,Apollo,Ares,Artemis,Athena,Demeter,Dionysus,Hades,Hecate,Hephaestus,Hera,Hercules,Hermes,Hestia,Nike,Pan,Poseidon,Tyche,Zeus',
    restricted: true
  });

  game.settings.register(HM.ID, 'alignments', {
    name: 'Available Alignments',
    hint: 'Comma-separated list of alignments available for character creation',
    scope: 'world',
    config: true,
    type: String,
    default: 'None,Lawful Good,Neutral Good,Chaotic Good,Lawful Neutral,True Neutral,Chaotic Neutral,Lawful Evil,Neutral Evil,Chaotic Evil',
    restricted: true
  });

  // Add a new setting for selecting the Dice Rolling Method
  game.settings.register(HM.ID, 'diceRollingMethod', {
    name: `${HM.ABRV}.settings.dice-rolling-method.name`,
    hint: `${HM.ABRV}.settings.dice-rolling-method.hint`,
    scope: 'client',
    config: true,
    type: String,
    requiresReload: true,
    choices: {
      standardArray: game.i18n.localize(`${HM.ABRV}.settings.dice-rolling-method.standard-array`),
      pointBuy: game.i18n.localize(`${HM.ABRV}.settings.dice-rolling-method.point-buy`),
      manualFormula: game.i18n.localize(`${HM.ABRV}.settings.dice-rolling-method.manual-formula`)
    },
    default: 'standardArray'
  });

  // Add the custom roll formula setting restricted to GM
  game.settings.register(HM.ID, 'customRollFormula', {
    name: `${HM.ABRV}.settings.custom-roll-formula.name`,
    hint: `${HM.ABRV}.settings.custom-roll-formula.hint`,
    scope: 'client',
    config: game.settings.get(HM.ID, 'diceRollingMethod') === 'manualFormula',
    type: String,
    restricted: true,
    default: '4d6kh3',
    onChange: (value) => {
      if (!value || value.trim() === '') {
        game.settings.set(HM.ID, 'customRollFormula', '4d6kh3'); // Reset to default if empty
        HM.log(3, 'Resetting Custom Roll Formula to default (4d6kh3)');
      }
    }
  });

  // Register chained rolls setting
  game.settings.register(HM.ID, 'chainedRolls', {
    name: `${HM.ABRV}.settings.chained-rolls.name`,
    hint: `${HM.ABRV}.settings.chained-rolls.hint`,
    scope: 'client',
    config: game.settings.get(HM.ID, 'diceRollingMethod') === 'manualFormula',
    type: Boolean,
    default: false
  });

  // Register roll delay setting
  game.settings.register(HM.ID, 'rollDelay', {
    name: `${HM.ABRV}.settings.roll-delay.name`,
    hint: `${HM.ABRV}.settings.roll-delay.hint`,
    scope: 'client',
    config: game.settings.get(HM.ID, 'diceRollingMethod') === 'manualFormula',
    type: Number,
    range: {
      min: 100,
      max: 2000,
      step: 100
    },
    default: 500
  });

  // Restricted to GM: Menu for custom compendium chooser
  game.settings.registerMenu(HM.ID, 'customCompendiumMenu', {
    name: `${HM.ABRV}.settings.custom-compendiums.menu.name`,
    hint: `${HM.ABRV}.settings.custom-compendiums.menu.hint`,
    label: `${HM.ABRV}.settings.custom-compendiums.menu.label`,
    icon: 'fa-solid fa-bars',
    type: CustomCompendiums,
    restricted: true
  });

  // World-scoped: Save selected class compendium packs (shared across all players)
  game.settings.register(HM.ID, 'classPacks', {
    name: `${HM.ABRV}.settings.class-packs.name`,
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // World-scoped: Save selected race compendium packs (shared across all players)
  game.settings.register(HM.ID, 'racePacks', {
    name: `${HM.ABRV}.settings.race-packs.name`,
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // World-scoped: Save selected background compendium packs (shared across all players)
  game.settings.register(HM.ID, 'backgroundPacks', {
    name: `${HM.ABRV}.settings.background-packs.name`,
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  // Register the custom standard array setting
  game.settings.register(HM.ID, 'customStandardArray', {
    name: `${HM.ABRV}.settings.custom-standard-array.name`,
    hint: `${HM.ABRV}.settings.custom-standard-array.hint`,
    scope: 'world',
    config: game.settings.get(HM.ID, 'diceRollingMethod') === 'standardArray',
    type: String,
    restricted: true,
    default: '', // Temporary default, checked in 'ready' hook
    onChange: (value) => {
      if (!value || value.trim() === '') {
        game.settings.set(HM.ID, 'customStandardArray', StatRoller.getStandardArrayDefault());
        HM.log(3, 'Custom Standard Array was reset to default values due to invalid length.');
      } else {
        StatRoller.validateAndSetCustomStandardArray(value);
      }
    }
  });
  Hooks.on('ready', async () => {
    const customArraySetting = game.settings.get(HM.ID, 'customStandardArray');
    if (!customArraySetting || customArraySetting.trim() === '') {
      await game.settings.set(HM.ID, 'customStandardArray', StatRoller.getStandardArrayDefault());
      HM.log(3, 'Custom Standard Array was reset to default values due to invalid length.');
    }
  });
}
