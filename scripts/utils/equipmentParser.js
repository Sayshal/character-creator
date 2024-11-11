import { DropdownHandler } from './index.js';
import { HM } from '../hero-mancer.js';

export class EquipmentParser {
  static renderedIds = new Map();

  // Static sets for item collections
  static simpleM = new Set();

  static simpleR = new Set();

  static martialM = new Set();

  static martialR = new Set();

  static music = new Set();

  static shield = new Set();

  static armor = new Set();

  constructor() {
    this.equipmentData = null;
    this.classId = DropdownHandler.selectionStorage.class.selectedId;
    this.backgroundId = DropdownHandler.selectionStorage.background.selectedId;
    this.proficiencies = new Set();
    this.combinedItemIds = new Set();

    HM.log(3, 'EquipmentParser initialized with:', {
      classId: this.classId,
      backgroundId: this.backgroundId
    });
  }

  /**
   * Helper function to retrieve a document by searching across all item-type compendiums.
   * @param {string} itemId The ID of the item to search for.
   * @returns {Promise<object | null>} - The found item or null if not found.
   */
  async findItemInCompendiums(itemId) {
    HM.log(3, `Searching for item ${itemId} in all 'Item' compendiums.`);
    for (const pack of game.packs.filter((pack) => pack.documentName === 'Item')) {
      const item = await pack.getDocument(itemId);
      if (item) {
        HM.log(3, `Item ${itemId} found in pack ${pack.metadata.label}`, item);
        return item;
      }
    }
    HM.log(3, `Item ${itemId} not found in any 'Item' compendiums.`);
    return null;
  }

  /**
   * Fetches starting equipment based on the selection for the specified type.
   * Also retrieves and updates proficiencies for the current selection.
   * @param {string} type The type (class, background).
   * @returns {Promise<Array>} - The starting equipment array.
   */
  async getStartingEquipment(type) {
    const { selectedId } = DropdownHandler.selectionStorage[type] || {};
    HM.log(3, `Fetching starting equipment for type: ${type}, selectedId: ${selectedId}`);

    if (!selectedId) {
      HM.log(3, `No selection found for type: ${type}`);
      return [];
    }

    const doc = await this.findItemInCompendiums(selectedId);

    if (doc) {
      HM.log(3, `Starting equipment found for type ${type}:`, doc.system.startingEquipment);
      this.proficiencies = await this.getProficiencies(doc.system.advancement || []);
    } else {
      HM.log(3, `No document found for type ${type} with selectedId ${selectedId}`);
    }

    return doc?.system.startingEquipment || [];
  }

  /**
   * Retrieves all granted proficiencies based on the provided advancements.
   * @param {Array} advancements The advancement data containing proficiency grants.
   * @returns {Promise<Set>} - A set of granted proficiencies.
   */
  async getProficiencies(advancements) {
    const proficiencies = new Set();

    for (const advancement of advancements) {
      if (advancement.configuration && advancement.configuration.grants) {
        for (const grant of advancement.configuration.grants) {
          proficiencies.add(grant);
        }
      }
    }
    HM.log(3, 'Collected proficiencies:', Array.from(proficiencies));
    return proficiencies;
  }

  /**
   * Fetches and combines equipment data for class and background.
   */
  async fetchEquipmentData() {
    HM.log(3, 'Fetching equipment data for class, and background.');

    const classEquipment = await this.getStartingEquipment('class');
    const backgroundEquipment = await this.getStartingEquipment('background');

    this.equipmentData = {
      class: classEquipment || [],
      background: backgroundEquipment || []
    };

    HM.log(3, 'Organized equipment data by type:', this.equipmentData);
  }

  /**
   * Renders equipment choices for class and background.
   * @returns {Promise<HTMLElement>} - The rendered HTML container for equipment choices.
   */
  async renderEquipmentChoices() {
    HM.log(3, EquipmentParser.lookupItems);
    await EquipmentParser.initializeLookupItems();
    HM.log(3, EquipmentParser.lookupItems);
    HM.log(3, 'Rendering equipment choices for class, and background.');
    this.combinedItemIds.clear();
    EquipmentParser.renderedIds.clear();

    await this.fetchEquipmentData();

    const container = document.createElement('div');
    container.classList.add('equipment-choices');

    for (const [type, items] of Object.entries(this.equipmentData)) {
      const sectionContainer = document.createElement('div');
      sectionContainer.classList.add(`${type}-equipment-section`);

      const header = document.createElement('h3');
      header.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Equipment`;
      sectionContainer.appendChild(header);

      for (const item of items) {
        const itemDoc = await fromUuidSync(item.key);
        item.name = itemDoc?.name || item.key;

        HM.log(3, `Creating HTML element for item in ${type} equipment:`, item);
        const itemElement = await this.createEquipmentElement(item);

        if (itemElement) {
          sectionContainer.appendChild(itemElement);
        }
      }

      container.appendChild(sectionContainer);
    }

    HM.log(3, 'Finished rendering equipment choices.');
    HM.log(3, 'CONTAINER: ', container);
    return container;
  }

  async createEquipmentElement(item) {
    // Log current contents of renderedIds for debugging
    HM.log(3, 'RENDEREDIDS:', Array.from(EquipmentParser.renderedIds.entries()));

    // Retrieve any existing item in renderedIds with the same ID
    const existingItem = EquipmentParser.renderedIds.get(item._id);

    // Check for duplicates: skip if an item with matching ID, sort, and group already exists
    if (existingItem && existingItem.sort === item.sort && existingItem.group === item.group) {
      HM.log(3, `Skipping duplicate rendering for item: ${item._id} with sort: ${item.sort} within group: ${item.group}`, item.name);
      return null;
    }

    // Add the current item to the renderedIds map, recording group, sort, and key
    EquipmentParser.renderedIds.set(item._id, { group: item.group, sort: item.sort, key: item.key });

    const itemContainer = document.createElement('div');
    itemContainer.classList.add('equipment-item');
    HM.log(3, 'Creating element for equipment item:', { id: item._id, type: item.type, label: item.label });

    if (!item.group && item.type === 'OR') {
      const labelElement = document.createElement('h4');
      labelElement.classList.add('parent-label');
      labelElement.textContent = item.label || 'Choose one of the following';
      itemContainer.appendChild(labelElement);

      const select = document.createElement('select');
      select.id = item._id;

      const uniqueItems = new Set();
      let focusInput = null; // Input for custom focus entry

      for (const child of item.children) {
        // Check if the child has already been rendered within the same group and sort
        const existingChild = EquipmentParser.renderedIds.get(child._id);
        if (existingChild && existingChild.sort === child.sort && existingChild.group === child.group) {
          continue;
        }

        // Add child to renderedIds with its details
        EquipmentParser.renderedIds.set(child._id, { group: child.group, sort: child.sort, key: child.key });

        // Handle AND groups for combined items (e.g., Leather Armor + Longbow + 20 Arrows)
        if (child.type === 'AND') {
          let combinedLabel = '';
          let combinedIds = [];

          for (const subChild of child.children) {
            const subChildItem = fromUuidSync(subChild.key);
            if (!subChildItem) {
              HM.log(3, `Failed to retrieve item from UUID: ${subChild.key}`);
              continue;
            }

            if (combinedLabel) combinedLabel += ' + ';
            combinedLabel += `${subChild.count || ''} ${subChildItem.name}`.trim();
            combinedIds.push(subChild._id);

            this.combinedItemIds.add(subChild._id);
          }

          if (combinedLabel && !uniqueItems.has(combinedLabel)) {
            uniqueItems.add(combinedLabel);
            const optionElement = document.createElement('option');
            optionElement.value = combinedIds.join(',');
            optionElement.textContent = combinedLabel;
            select.appendChild(optionElement);
            HM.log(3, 'Added combined AND group item to OR dropdown:', { label: combinedLabel, ids: combinedIds });
          }
          continue;
        }

        // Handle individual items or lookups
        const trueName = child.label.replace(/\s*\(.*?\)\s*/g, '').trim();
        if (child.type === 'linked') {
          if (uniqueItems.has(trueName) || this.combinedItemIds.has(child._id)) continue;
          uniqueItems.add(trueName);

          const optionElement = document.createElement('option');
          optionElement.value = child._id;
          optionElement.textContent = trueName;

          if (child.requiresProficiency) {
            const requiredProficiency = `${child.type}:${child.key}`;
            if (!this.proficiencies.has(requiredProficiency)) {
              optionElement.disabled = true;
              optionElement.textContent = `${trueName} (${game.i18n.localize('hm.app.equipment.lacks-proficiency')})`;
            }
          }
          select.appendChild(optionElement);
          HM.log(3, 'Added linked item to OR dropdown:', { id: child._id, name: trueName });
        } else if (child.type === 'focus' && child.key === 'arcane') {
          uniqueItems.add('Any Arcane Focus');
          const optionElement = document.createElement('option');
          optionElement.value = 'arcaneFocus';
          optionElement.textContent = 'Any Arcane Focus';
          select.appendChild(optionElement);

          // Create input field for custom arcane focus (hidden initially)
          focusInput = document.createElement('input');
          focusInput.type = 'text';
          focusInput.placeholder = 'Enter your arcane focus...';
          focusInput.classList.add('arcane-focus-input');
          focusInput.style.display = 'none';

          HM.log(3, 'Added Any Arcane Focus option with input field support');
        } else if (['weapon', 'armor', 'tool', 'shield'].includes(child.type)) {
          // Convert the Set to an Array before sorting
          const lookupOptions = Array.from(EquipmentParser.lookupItems[child.key]);
          lookupOptions.sort((a, b) => a.name.localeCompare(b.name));

          lookupOptions.forEach((option) => {
            // Check if this option has already been rendered in the same group and sort
            const existingOption = EquipmentParser.renderedIds.get(option._id);
            if (existingOption && existingOption.sort === child.sort && existingOption.group === child.group) return;

            // Add the option to uniqueItems and update renderedIds
            uniqueItems.add(option.name);
            EquipmentParser.renderedIds.set(option._id, { group: child.group, sort: child.sort, key: child.key });

            const optionElement = document.createElement('option');
            optionElement.value = option._id;
            optionElement.textContent = option.name;

            if (child.requiresProficiency) {
              const requiredProficiency = `${child.type}:${child.key}`;
              if (!this.proficiencies.has(requiredProficiency)) {
                optionElement.disabled = true;
                optionElement.textContent = `${option.name} (${game.i18n.localize('hm.app.equipment.lacks-proficiency')})`;
              }
            }

            select.appendChild(optionElement);
            HM.log(3, `Added ${child.type} item to OR dropdown:`, { id: option._id, name: option.name });
          });
        }
      }

      // Event listener to toggle visibility of custom focus input
      select.addEventListener('change', (event) => {
        if (focusInput) {
          focusInput.style.display = event.target.value === 'arcaneFocus' ? 'block' : 'none';
          if (event.target.value !== 'arcaneFocus') {
            focusInput.value = ''; // Clear input if switching back to another option
          }
        }
      });

      // Ensure dropdown is appended first, followed by the input field
      itemContainer.appendChild(select);
      if (focusInput) {
        itemContainer.appendChild(focusInput);
      }

      HM.log(3, 'Added OR type item with dropdown for top-level OR:', {
        id: item._id,
        options: Array.from(uniqueItems)
      });
    } else {
      // Handle AND and linked items not part of an OR dropdown
      switch (item.type) {
        case 'AND': {
          const andLabelElement = document.createElement('h4');
          andLabelElement.classList.add('parent-label');
          andLabelElement.textContent = item.label || 'All of the following:';
          itemContainer.appendChild(andLabelElement);

          for (const child of item.children) {
            if (this.combinedItemIds.has(child._id)) continue;
            const childElement = await this.createEquipmentElement(child);
            if (childElement) itemContainer.appendChild(childElement);
          }
          break;
        }

        case 'linked': {
          if (this.combinedItemIds.has(item._id)) {
            HM.log(3, `Skipping combined linked item: ${item._id}`);
            return null;
          }
          const linkedCheckbox = document.createElement('input');
          linkedCheckbox.type = 'checkbox';
          linkedCheckbox.id = item._id;
          linkedCheckbox.checked = true;
          itemContainer.appendChild(linkedCheckbox);

          const linkedLabel = document.createElement('label');
          linkedLabel.htmlFor = item._id;
          linkedLabel.textContent = item.label || 'Unknown Linked Item';
          itemContainer.appendChild(linkedLabel);
          HM.log(3, 'Added linked type item with checkbox:', { id: item._id, name: item.label });
          break;
        }

        case 'focus': {
          const focusLabel = document.createElement('label');
          focusLabel.htmlFor = item._id;
          focusLabel.textContent = item.label || 'Custom Focus';
          itemContainer.appendChild(focusLabel);

          const input = document.createElement('input');
          input.type = 'text';
          input.id = item._id;
          input.value = `${item.key} ${item.type}`;
          itemContainer.appendChild(input);

          HM.log(3, 'Added focus item with input field:', { id: item._id, defaultValue: input.value });
          break;
        }

        default:
          HM.log(3, `Unknown item type encountered: ${item.type}`);
      }
    }

    HM.log(3, 'ITEM CONTAINER: ', itemContainer);
    return itemContainer;
  }

  static async initializeLookupItems() {
    if (EquipmentParser.lookupItemsInitialized) return; // Skip if already initialized
    EquipmentParser.lookupItemsInitialized = true;

    // Populate individual sets
    EquipmentParser.simpleM = new Set(await EquipmentParser.collectLookupItems('simpleM'));
    EquipmentParser.simpleR = new Set(await EquipmentParser.collectLookupItems('simpleR'));
    EquipmentParser.martialM = new Set(await EquipmentParser.collectLookupItems('martialM'));
    EquipmentParser.martialR = new Set(await EquipmentParser.collectLookupItems('martialR'));
    EquipmentParser.music = new Set(await EquipmentParser.collectLookupItems('music'));
    EquipmentParser.shield = new Set(await EquipmentParser.collectLookupItems('shield'));
    EquipmentParser.armor = new Set(await EquipmentParser.collectLookupItems('armor'));

    // Now dynamically create lookupItems with combined sets
    EquipmentParser.lookupItems = {
      sim: new Set([...EquipmentParser.simpleM, ...EquipmentParser.simpleR]),
      simpleM: EquipmentParser.simpleM,
      simpleR: EquipmentParser.simpleR,
      mar: new Set([...EquipmentParser.martialM, ...EquipmentParser.martialR]),
      martialM: EquipmentParser.martialM,
      martialR: EquipmentParser.martialR,
      music: EquipmentParser.music,
      shield: EquipmentParser.shield,
      armor: EquipmentParser.armor
    };

    HM.log(3, 'EquipmentParser lookup items initialized:', EquipmentParser.lookupItems);
  }

  static async collectLookupItems(lookupKey) {
    HM.log(3, `Collecting items for lookupKey: ${lookupKey}`);
    const items = [];
    const typesToFetch = ['weapon', 'armor', 'tool', 'equipment', 'gear', 'consumable', 'shield'];

    for (const pack of game.packs.filter((pack) => pack.documentName === 'Item')) {
      const documents = await pack.getDocuments({ type__in: typesToFetch });

      documents.forEach((item) => {
        const itemType = item.system?.type?.value || item.type;
        const isMagic = item.system?.properties instanceof Set && item.system.properties.has('mgc');

        if (item.name === 'Unarmed Strike' || isMagic) return;

        if (
          (lookupKey === 'sim' && (itemType === 'simpleM' || itemType === 'simpleR')) ||
          (lookupKey === 'simpleM' && itemType === 'simpleM') ||
          (lookupKey === 'simpleR' && itemType === 'simpleR') ||
          (lookupKey === 'mar' && (itemType === 'martialM' || itemType === 'martialR')) ||
          (lookupKey === 'martialM' && itemType === 'martialM') ||
          (lookupKey === 'martialR' && itemType === 'martialR') ||
          (lookupKey === 'music' && itemType === 'music') ||
          (lookupKey === 'shield' && itemType === 'shield') ||
          (lookupKey === 'armor' && itemType === 'armor') ||
          itemType === lookupKey
        ) {
          items.push(item);
        }
      });
    }

    HM.log(3, `Collected ${items.length} items for lookupKey '${lookupKey}'`);
    return items;
  }
}
