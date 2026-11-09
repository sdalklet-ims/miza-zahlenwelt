# Einmaliges Hilfsskript: Haustier-Daten in progress.ts und texts.ts eintragen, Supermarkt-Texte.
import json


def sub(p, f):
    s = open(p, encoding='utf-8').read()
    s = f(s)
    open(p, 'w', encoding='utf-8').write(s)


sub('src/core/progress.ts', lambda s: s.replace("  posV: number;\n}", "  posV: number;\n  /** Haustier (null = noch keins) und Futtervorrat */\n  pet: { kind: string; name: string; fill: number; t: number; stock: Record<string, number>; fed: number } | null;\n  petStock: Record<string, number>;\n}").replace("  posV: 0,\n});", "  posV: 0,\n  pet: null,\n  petStock: {},\n});"))
sub('src/core/texts.ts', lambda s: s + """
export interface PetKindDef { id: string; name: string; icon: string; price: number; likes: string[]; names: string[] }
export interface PetFoodDef { id: string; name: string; icon: string; price: number; fill: number }
export const petCfg = files['/content/pets.json'] as { kinds: PetKindDef[]; foods: PetFoodDef[] };
""")
j = json.load(open('content/worlds/wald.json', encoding='utf-8'))
j['texts']['wald.fuchs.hello'] = ['fuchs', 'Willkommen im Supermarkt, Mia! Vom Fundament bis zur Deko, dazu Tierbedarf. Sammle Münzen und füll deinen Einkaufswagen!']
j['texts']['wald.fuchs.buy'] = ['fuchs', 'Vielen Dank für den Einkauf! Das Baumaterial liegt am Bauplatz bereit.']
json.dump(j, open('content/worlds/wald.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('ok')
