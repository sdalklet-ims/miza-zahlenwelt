# Einmaliges Hilfsskript: Tierhaus-Daten (Gadgets ab Sternenzahl), Texte, Typen
import json
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for o, n in pairs:
        assert o in s, (p, o[:80])
        s = s.replace(o, n, 1)
    open(p, 'w', encoding='utf-8').write(s)

G = [
 {"id":"tunnel","animal":"meerschwein","name":"Gemüse-Tunnel","desc":"Ein Tunnel aus Gurke und Kohl. Hindurchflitzen macht Spaß!","stars":8,"fav":True,"anim":"tunnel","emoji":"🥒","reaction":"{name} flitzt quietschend durch den Tunnel."},
 {"id":"gurkenmatte","animal":"meerschwein","name":"Gurken-Hängematte","desc":"Darin schaukelt {name} und träumt von Salat.","stars":20,"fav":False,"anim":"hammock","emoji":"🛏️","reaction":"{name} schaukelt in der Hängematte."},
 {"id":"huegel","animal":"kaninchen","name":"Möhren-Hügel","desc":"Hoch hinauf, hinunter hüpfen und einen Freudensprung machen.","stars":12,"fav":True,"anim":"hill","emoji":"🥕","reaction":"{name} hoppelt den Hügel hinauf und macht einen Freudensprung!"},
 {"id":"sandkiste","animal":"kaninchen","name":"Buddel-Sandkiste","desc":"Zum Graben. Manchmal findet sich eine Möhre.","stars":26,"fav":False,"anim":"sandbox","emoji":"🏖️","reaction":"{name} gräbt im Sand und findet eine Möhre!"},
 {"id":"laufrad","animal":"hamster","name":"Laufrad mit Lichtern","desc":"Es dreht sich und leuchtet bunt, je schneller {name} rennt.","stars":16,"fav":True,"anim":"wheel","emoji":"🎡","reaction":"{name} rennt im Laufrad, die Lichter blinken!"},
 {"id":"burg","animal":"hamster","name":"Backentaschen-Burg","desc":"Ein Turm, in dem {name} Körner versteckt.","stars":32,"fav":False,"anim":"castle","emoji":"🏰","reaction":"{name} stopft die Backen voll und versteckt Körner im Turm."},
 {"id":"schaukel","animal":"wellensittich","name":"Schaukel mit Glöckchen","desc":"Schaukeln, klingeln und dazu singen.","stars":6,"fav":True,"anim":"swing","emoji":"🔔","reaction":"{name} schaukelt und singt, das Glöckchen klingelt."},
 {"id":"spiegel","animal":"wellensittich","name":"Spiegel-Sternchen","desc":"{name} unterhält sich mit dem Spiegelbild.","stars":22,"fav":False,"anim":"mirror","emoji":"🪞","reaction":"{name} plustert sich vor dem Spiegel auf."},
 {"id":"girlande","animal":"alle","name":"Laternen-Girlande","desc":"Bunte Lichter an der Decke, gemütlich für alle.","stars":10,"fav":False,"anim":"lights","emoji":"🏮","reaction":""},
 {"id":"buehne","animal":"alle","name":"Mini-Bühne","desc":"Die Tiere führen nacheinander Kunststücke vor.","stars":36,"fav":False,"anim":"stage","emoji":"🎭","reaction":"{name} zeigt ein Kunststück. Mia klatscht!"},
 {"id":"brunnen","animal":"alle","name":"Futterbrunnen","desc":"Wasser und Futter, hier treffen sich alle.","stars":44,"fav":False,"anim":"fountain","emoji":"⛲","reaction":"{name} trinkt am Brunnen."},
]
T = {
 "tierhaus.empty": ["mia","Das Tierhaus ist noch leer. Haustiere gibt es im Supermarkt im Gang Tierbedarf."],
 "tierhaus.new": ["mia","Im Tierhaus ist etwas Neues! {name} kann ab jetzt benutzt werden."],
 "tierhaus.hi": ["mia","Hallo {name}! Schön, dass es dir hier gefällt."],
 "tierhaus.fav": ["mia","{name} freut sich riesig über {gadget}! Das ist das Lieblingsstück."],
 "tierhaus.play": ["mia","{text}"],
 "tierhaus.locked": ["mia","Dieses Stück kommt, wenn du {stars} Sterne gesammelt hast."],
}
json.dump({"gadgets":G,"texts":T}, open('content/tierhaus.json','w',encoding='utf-8'), ensure_ascii=False, indent=2)
ed('src/core/texts.ts', [("export const petCfg =", "export interface TierGadget { id: string; animal: string; name: string; desc: string; stars: number; fav: boolean; anim: string; emoji: string; reaction: string }\nexport const tierCfg = files['/content/tierhaus.json'] as { gadgets: TierGadget[] };\nexport const petCfg =")])
print('ok')
