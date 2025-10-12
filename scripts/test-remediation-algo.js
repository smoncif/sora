/**
 * Test de l'algorithme de remédiation optimisé
 * Cas d'exemple : SE16/SE16N vs ACTVT 1-6
 */

const testCases = [
  {
    name: "Cas SE16/SE16N - Doit privilégier restriction ACTVT",
    scenario: {
      restrainableActions: [
        {
          code: "OYEA",
          resources: [
            {
              code: "S_IDOCCTRL",
              externalResources: [
                {
                  code: "ACTVT",
                  values: ["1", "2", "3", "4", "5", "6"]
                }
              ]
            }
          ]
        },
        {
          code: "ABC",
          resources: [
            {
              code: "S_IDOCCTRL",
              externalResources: [
                {
                  code: "ACTVT",
                  values: ["6"]
                }
              ]
            }
          ]
        }
      ],
      suppressableActions: [
        {
          code: "SE16",
          resources: [{ code: "S_TCODE" }]
        },
        {
          code: "SE16N",
          resources: [{ code: "S_TCODE" }]
        }
      ]
    },
    expected: {
      ratio: 1.0, // 2 suppressibles / 2 restrainables
      decision: "restriction",
      resourceCount: 1, // S_IDOCCTRL::ACTVT
      valuesCount: 6, // Valeurs 1-6
      reason: "Impact 6 valeurs < Impact 2 suppressions (score de SE16=50)"
    }
  },
  
  {
    name: "Cas ratio élevé - Beaucoup de suppressibles",
    scenario: {
      restrainableActions: [
        {
          code: "ACTION1",
          resources: [
            {
              code: "RESS1",
              externalResources: [{ code: "EXT1", values: ["1", "2"] }]
            }
          ]
        },
        {
          code: "ACTION2",
          resources: [
            {
              code: "RESS2",
              externalResources: [{ code: "EXT2", values: ["3", "4"] }]
            }
          ]
        }
      ],
      suppressableActions: [
        { code: "SUPP1", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP2", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP3", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP4", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP5", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP6", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP7", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP8", resources: [{ code: "S_TCODE" }] }
      ]
    },
    expected: {
      ratio: 4.0, // 8 suppressibles / 2 restrainables
      decision: "restriction",
      reason: "Ratio > 2.0 → Toujours restreindre"
    }
  },
  
  {
    name: "Cas ressource unique très efficace",
    scenario: {
      restrainableActions: [
        {
          code: "ACTION1",
          resources: [
            {
              code: "RESS1",
              externalResources: [{ code: "EXT1", values: ["5"] }]
            }
          ]
        },
        {
          code: "ACTION2",
          resources: [
            {
              code: "RESS1",
              externalResources: [{ code: "EXT1", values: ["5"] }]
            }
          ]
        },
        {
          code: "ACTION3",
          resources: [
            {
              code: "RESS1",
              externalResources: [{ code: "EXT1", values: ["5"] }]
            }
          ]
        }
      ],
      suppressableActions: [
        { code: "SUPP1", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP2", resources: [{ code: "S_TCODE" }] }
      ]
    },
    expected: {
      ratio: 0.67, // 2 suppressibles / 3 restrainables
      decision: "restriction",
      resourceCount: 1, // RESS1::EXT1
      valuesCount: 1, // Valeur 5
      score: 3.0, // 3 actions / 1 valeur
      reason: "Score excellent : 1 seule valeur couvre 3 actions"
    }
  },
  
  {
    name: "Cas aucune ressource commune - Restriction toujours privilégiée avec score",
    scenario: {
      restrainableActions: [
        {
          code: "ACTION1",
          resources: [
            {
              code: "RESS1",
              externalResources: [{ code: "EXT1", values: ["1", "2"] }]
            }
          ]
        },
        {
          code: "ACTION2",
          resources: [
            {
              code: "RESS2",
              externalResources: [{ code: "EXT2", values: ["3", "4"] }]
            }
          ]
        },
        {
          code: "ACTION3",
          resources: [
            {
              code: "RESS3",
              externalResources: [{ code: "EXT3", values: ["5", "6"] }]
            }
          ]
        },
        {
          code: "ACTION4",
          resources: [
            {
              code: "RESS4",
              externalResources: [{ code: "EXT4", values: ["7", "8"] }]
            }
          ]
        }
      ],
      suppressableActions: [
        { code: "SUPP1", resources: [{ code: "S_TCODE" }] },
        { code: "SUPP2", resources: [{ code: "S_TCODE" }] }
      ]
    },
    expected: {
      ratio: 0.5, // 2 suppressibles / 4 restrainables
      decision: "restriction",
      reason: "Impact 8 valeurs < Impact 100 (2 suppressions × 50)"
    }
  }
];

console.log("🧪 Tests de l'algorithme de remédiation optimisé\n");
console.log("=" .repeat(80));

testCases.forEach((testCase, index) => {
  console.log(`\n\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(80));
  
  const { restrainableActions, suppressableActions } = testCase.scenario;
  const ratio = suppressableActions.length / restrainableActions.length;
  
  console.log(`\n📊 Données:`);
  console.log(`   - Actions restrainables: ${restrainableActions.length}`);
  console.log(`   - Actions suppressables: ${suppressableActions.length}`);
  console.log(`   - Ratio: ${ratio.toFixed(2)}`);
  
  // Analyser les ressources communes
  const resourceMap = new Map();
  restrainableActions.forEach(action => {
    action.resources.forEach(resource => {
      if (resource.code === 'S_TCODE') return;
      
      resource.externalResources?.forEach(extRes => {
        const key = `${resource.code}::${extRes.code}`;
        
        if (!resourceMap.has(key)) {
          resourceMap.set(key, {
            resourceKey: key,
            actions: [],
            totalValues: new Set()
          });
        }
        
        const analysis = resourceMap.get(key);
        analysis.actions.push(action);
        
        if (extRes.values) {
          extRes.values.forEach(val => analysis.totalValues.add(val));
        }
      });
    });
  });
  
  const ressourcesCommunes = Array.from(resourceMap.values()).map(analysis => ({
    ...analysis,
    score: analysis.actions.length / (analysis.totalValues.size || 1)
  })).sort((a, b) => b.score - a.score);
  
  console.log(`\n🔍 Analyse des ressources communes:`);
  if (ressourcesCommunes.length === 0) {
    console.log(`   ❌ Aucune ressource commune`);
  } else {
    ressourcesCommunes.forEach(r => {
      console.log(`   - ${r.resourceKey}:`);
      console.log(`     • Actions couvertes: ${r.actions.length}`);
      console.log(`     • Valeurs: ${r.totalValues.size}`);
      console.log(`     • Score: ${r.score.toFixed(2)}`);
    });
  }
  
  const impactRestrictions = ressourcesCommunes.reduce((sum, r) => sum + r.totalValues.size, 0);
  const impactSuppressions = suppressableActions.length * 50; // Score de suppression = 50
  
  console.log(`\n💡 Décision de l'algorithme:`);
  
  let decision = '';
  let actualReason = '';
  
  if (ratio > 2.0 && restrainableActions.length > 0) {
    decision = 'restriction';
    actualReason = `Ratio ${ratio.toFixed(2)} > 2.0 → Toujours restreindre`;
  } else if (ratio < 0.5 && restrainableActions.length > 0) {
    if (ressourcesCommunes.length > 0 && impactRestrictions <= impactSuppressions) {
      decision = 'restriction';
      actualReason = `Impact restrictions (${impactRestrictions}) ≤ Impact suppressions (${impactSuppressions})`;
    } else {
      decision = 'suppression';
      actualReason = `Impact restrictions (${impactRestrictions}) > Impact suppressions (${impactSuppressions})`;
    }
  } else {
    if (ressourcesCommunes.length > 0 && impactRestrictions <= impactSuppressions) {
      decision = 'restriction';
      actualReason = `Impact restrictions (${impactRestrictions}) ≤ Impact suppressions (${impactSuppressions})`;
    } else {
      decision = 'suppression';
      actualReason = `Impact suppressions (${impactSuppressions}) < Impact restrictions (${impactRestrictions})`;
    }
  }
  
  console.log(`   ✅ Décision: ${decision.toUpperCase()}`);
  console.log(`   📝 Raison: ${actualReason}`);
  
  console.log(`\n🎯 Résultat attendu:`);
  console.log(`   - Décision: ${testCase.expected.decision.toUpperCase()}`);
  console.log(`   - Raison: ${testCase.expected.reason}`);
  
  const isSuccess = decision === testCase.expected.decision;
  console.log(`\n${isSuccess ? '✅ PASS' : '❌ FAIL'}`);
});

console.log("\n\n" + "=".repeat(80));
console.log("🏁 Tests terminés");

