// Extracted from game2.html — pure data, no logic.

const LOCATION_TREE = {
  regions: [
    {
      id: 'town', name: 'Town', icon: '🏕️',
      locations: {
        city_root: {
          id: 'city_root', name: 'Refugee Camp', icon: '🔥',
          desc: 'A small camp with campfires and tents',
          background: 'assets/town_refugee_camp.svg',
          ambient: null,
          children: ['trade_district', 'residential', 'wilderness'],
        },
        trade_district: {
          id: 'trade_district', name: 'Trade District', icon: '🏪',
          desc: 'Merchants and craftsmen',
          background: 'assets/town_refugee_camp.svg',
          children: ['blacksmith', 'tavern'],
        },
        residential: {
          id: 'residential', name: 'Residential', icon: '⛺',
          desc: 'Where refugees sleep',
          background: 'assets/town_refugee_camp.svg',
          children: [],
        },
        wilderness: {
          id: 'wilderness', name: 'Wilderness', icon: '🌲',
          desc: 'The outskirts of camp',
          background: 'assets/town_refugee_camp.svg',
          locked: true, unlockCondition: 'town_camp_upgraded',
          children: [],
        },
        blacksmith: {
          id: 'blacksmith', name: 'Blacksmith', icon: '🔨',
          desc: 'Forge weapons and armor',
          background: 'assets/town_refugee_camp.svg',
          children: [],
        },
        tavern: {
          id: 'tavern', name: 'Tavern', icon: '🍺',
          desc: 'Rest and hear rumors',
          background: 'assets/town_refugee_camp.svg',
          children: [],
        },
      },
    },
    {
      id: 'graveyard', name: 'Graveyard', icon: '⚰️',
      locations: {
        graveyard_entrance: {
          id: 'graveyard_entrance', name: 'Cemetery Gate', icon: '🚪',
          desc: 'The entrance to the old graveyard',
          background: 'assets/town_refugee_camp.svg',
          children: ['cemetery', 'crypt'],
        },
        cemetery: {
          id: 'cemetery', name: 'Cemetery', icon: '🪦',
          desc: 'Rows of weathered tombstones',
          background: 'assets/town_refugee_camp.svg',
          children: [],
        },
        crypt: {
          id: 'crypt', name: 'Crypt', icon: '💀',
          desc: 'Dark passages below',
          background: 'assets/town_refugee_camp.svg',
          locked: true, unlockCondition: 'graveyard_warning',
          children: [],
        },
      },
    },
    {
      id: 'forest', name: 'Forest', icon: '🌳',
      locations: {
        forest_edge: {
          id: 'forest_edge', name: 'Forest Edge', icon: '🌿',
          desc: 'Where the trees begin',
          background: 'assets/town_refugee_camp.svg',
          locked: true, unlockCondition: 'town_forest_unlocked',
          children: ['deep_woods'],
        },
        deep_woods: {
          id: 'deep_woods', name: 'Deep Woods', icon: '🌑',
          desc: 'Ancient and untamed',
          background: 'assets/town_refugee_camp.svg',
          locked: true, unlockCondition: 'town_forest_unlocked',
          children: [],
        },
      },
    },
  ],
};
