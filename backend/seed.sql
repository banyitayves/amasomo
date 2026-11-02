insert into public.subjects (id, name, description, icon, color, sort_order) values
('10000000-0000-4000-8000-000000000001',
 '{"rw":"Imibare","en":"Mathematics","sw":"Hisabati","fr":"Mathématiques"}',
 '{"rw":"Imibare idufasha gusobanukirwa n’isi.","en":"Find patterns and make sense of the world.","sw":"Tambua mifumo na uelewe ulimwengu.","fr":"Repérez des motifs et comprenez le monde."}',
 'calculator','violet',1),
('10000000-0000-4000-8000-000000000002',
 '{"rw":"Ubumenyi bw’ibinyabuzima","en":"Biology","sw":"Biolojia","fr":"Biologie"}',
 '{"rw":"Menya ibinyabuzima n’uko bikorana.","en":"Explore living things and how they connect.","sw":"Chunguza viumbe na uhusiano wao.","fr":"Explorez le vivant et ses interactions."}',
 'leaf','emerald',2),
('10000000-0000-4000-8000-000000000003',
 '{"rw":"Ubumenyi bw’umubiri","en":"Physics","sw":"Fizikia","fr":"Physique"}',
 '{"rw":"Sobanukirwa n’ingufu n’imigendere.","en":"Discover motion, energy, and the forces around us.","sw":"Gundua mwendo, nishati na nguvu.","fr":"Découvrez le mouvement, l’énergie et les forces."}',
 'atom','sky',3)
on conflict (id) do nothing;

insert into public.topics (id,subject_id,title,description,sort_order) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 '{"rw":"Imibare y’ibanze","en":"Number patterns","sw":"Mifumo ya namba","fr":"Les suites de nombres"}',
 '{"rw":"Shakisha uburyo imibare itondekanye.","en":"Notice how numbers can follow a rule.","sw":"Tambua jinsi namba zinavyofuata kanuni.","fr":"Repérez la règle suivie par les nombres."}',1),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
 '{"rw":"Uruhererekane rw’ibinyabuzima","en":"Ecosystems","sw":"Mifumo ya ikolojia","fr":"Les écosystèmes"}',
 '{"rw":"Uburyo ibinyabuzima n’ibidukikije bikorana.","en":"How living things interact with their environment.","sw":"Jinsi viumbe vinavyoingiliana na mazingira.","fr":"Les relations entre les êtres vivants et leur milieu."}',1),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003',
 '{"rw":"Imigendere n’ingufu","en":"Motion and forces","sw":"Mwendo na nguvu","fr":"Mouvement et forces"}',
 '{"rw":"Menya uburyo ibintu bigenda n’impamvu.","en":"Understand how and why objects move.","sw":"Elewa jinsi na kwa nini vitu husogea.","fr":"Comprenez comment et pourquoi les objets bougent."}',1)
on conflict (id) do nothing;

insert into public.lessons (id,topic_id,title,summary,content,sort_order) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
 '{"rw":"Shakisha amategeko y’imibare","en":"Finding number rules","sw":"Kutafuta kanuni za namba","fr":"Trouver la règle d’une suite"}',
 '{"rw":"Menya uko wakurikiranya imibare.","en":"Learn to spot what changes from one number to the next.","sw":"Jifunze kuona kinachobadilika kutoka namba moja hadi nyingine.","fr":"Apprenez à repérer ce qui change d’un nombre à l’autre."}',
 '{"rw":"Urukurikirane rw’imibare ni imibare ikurikirana hakurikijwe itegeko.\\n\\nUrugero: 2, 5, 8, 11. Buri gihe twongeraho 3.\\n\\nKugira ngo ubone umubare ukurikira, menya itandukaniro riri hagati y’imibare ibiri ikurikirana, hanyuma ukomeze iryo tegeko.","en":"A number sequence is a list that follows a rule.\\n\\nFor example: 2, 5, 8, 11. We add 3 each time.\\n\\nTo find the next number, compare neighboring terms, then continue the same rule.","sw":"Mfuatano wa namba ni orodha inayofuata kanuni.\\n\\nKwa mfano: 2, 5, 8, 11. Tunaongeza 3 kila mara.\\n\\nIli kupata namba inayofuata, linganisha namba jirani kisha endelea na kanuni hiyo.","fr":"Une suite est une liste de nombres qui suit une règle.\\n\\nPar exemple : 2, 5, 8, 11. On ajoute 3 à chaque étape.\\n\\nPour trouver le nombre suivant, comparez deux termes voisins puis continuez avec la même règle."}',1),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',
 '{"rw":"Urusobe rw’ibidukikije","en":"A web of life","sw":"Mtandao wa viumbe","fr":"Un réseau du vivant"}',
 '{"rw":"Ibinyabuzima bishingirana mu bidukikije.","en":"Living things depend on one another in an ecosystem.","sw":"Viumbe hutegemeana katika mfumo wa ikolojia.","fr":"Les êtres vivants dépendent les uns des autres."}',
 '{"rw":"Urusobe rw’ibidukikije rugizwe n’ibinyabuzima n’ibidukikije bidafite ubuzima, nk’amazi n’ubutaka.\\n\\nIbimera bifata ingufu z’izuba kugira ngo bikure. Inyamaswa zimwe zirya ibimera, izindi zikarya izo nyamaswa.\\n\\nIyo igice kimwe gihindutse, bishobora kugira ingaruka ku bindi binyabuzima byose.","en":"An ecosystem includes living things and non-living parts of their environment, such as water and soil.\\n\\nPlants use energy from sunlight to grow. Some animals eat plants, while others eat those animals.\\n\\nWhen one part changes, it can affect all the other living things.","sw":"Mfumo wa ikolojia unajumuisha viumbe na vitu visivyo hai katika mazingira yao, kama maji na udongo.\\n\\nMimea hutumia nishati ya jua kukua. Wanyama wengine hula mimea, na wengine hula wanyama hao.\\n\\nSehemu moja inapobadilika, inaweza kuathiri viumbe vingine vyote.","fr":"Un écosystème comprend les êtres vivants et les éléments non vivants de leur milieu, comme l’eau et le sol.\\n\\nLes plantes utilisent l’énergie du soleil pour pousser. Certains animaux mangent des plantes, d’autres mangent ces animaux.\\n\\nLe changement d’un élément peut avoir des conséquences sur tous les autres."}',1),
('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003',
 '{"rw":"Imbaraga n’imigendere","en":"Forces and motion","sw":"Nguvu na mwendo","fr":"Forces et mouvement"}',
 '{"rw":"Imbaraga zishobora guhindura uko ikintu kigenda.","en":"A force can change how an object moves.","sw":"Nguvu inaweza kubadilisha jinsi kitu kinavyosogea.","fr":"Une force peut modifier le mouvement d’un objet."}',
 '{"rw":"Imbaraga ni ugusunika cyangwa gukurura. Zishobora gutuma ikintu gihagarara, cyihuta, cyangwa gihindura icyerekezo.\\n\\nIyo usunitse umupira, ukoresha imbaraga kugira ngo utangire kugenda. Iyo umupira uhagaze, ubutaka n’umwuka bifasha kuwutindahaza.\\n\\nIbintu byinshi bikenera imbaraga zitaringanije kugira ngo bihindure umuvuduko.","en":"A force is a push or a pull. It can make an object stop, speed up, or change direction.\\n\\nWhen you kick a ball, you apply a force to set it in motion. Friction with the ground and air gradually slows it down.\\n\\nAn unbalanced force changes an object’s motion.","sw":"Nguvu ni msukumo au mvuto. Inaweza kusimamisha kitu, kukiongeza kasi au kubadilisha mwelekeo wake.\\n\\nUnapopiga mpira, unatumia nguvu kuufanya uanze kusogea. Msuguano wa ardhi na hewa huupunguza mwendo hatua kwa hatua.\\n\\nNguvu isiyosawazishwa hubadilisha mwendo wa kitu.","fr":"Une force est une poussée ou une traction. Elle peut arrêter un objet, l’accélérer ou changer sa direction.\\n\\nEn frappant un ballon, vous exercez une force qui le met en mouvement. Les frottements du sol et de l’air le ralentissent peu à peu.\\n\\nUne force non équilibrée modifie le mouvement d’un objet."}',1)
on conflict (id) do nothing;

insert into public.questions (id,topic_id,question_type,prompt,options,answer,explanation,sort_order) values
('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','exercise',
 '{"rw":"Ni uwuhe mubare ukurikiraho: 4, 7, 10, ...?","en":"What number comes next: 4, 7, 10, ...?","sw":"Ni namba gani inafuata: 4, 7, 10, ...?","fr":"Quel nombre vient ensuite : 4, 7, 10, ... ?"}',
 '{"A":{"rw":"12","en":"12","sw":"12","fr":"12"},"B":{"rw":"13","en":"13","sw":"13","fr":"13"},"C":{"rw":"14","en":"14","sw":"14","fr":"14"},"D":{"rw":"15","en":"15","sw":"15","fr":"15"}}','B',
 '{"rw":"Twongeraho 3 buri gihe: 4, 7, 10, hanyuma 13.","en":"We add 3 each time: 4, 7, 10, then 13.","sw":"Tunaongeza 3 kila mara: 4, 7, 10, kisha 13.","fr":"On ajoute 3 à chaque étape : 4, 7, 10, puis 13."}',1),
('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','exercise',
 '{"rw":"Ni ikihe kintu ibimera bikoresha mu gukora ibiryo?","en":"What do plants use to make their food?","sw":"Mimea hutumia nini kutengeneza chakula chao?","fr":"Qu’utilisent les plantes pour fabriquer leur nourriture ?"}',
 '{"A":{"rw":"Urumuri rw’izuba","en":"Sunlight","sw":"Mwanga wa jua","fr":"La lumière du soleil"},"B":{"rw":"Umusenyi gusa","en":"Sand only","sw":"Mchanga pekee","fr":"Du sable uniquement"},"C":{"rw":"Amabuye","en":"Rocks","sw":"Miamba","fr":"Des roches"},"D":{"rw":"Urusaku","en":"Sound","sw":"Sauti","fr":"Du son"}}','A',
 '{"rw":"Ibimera bikoresha urumuri rw’izuba n’amazi n’umwuka kugira ngo bikure kandi bikore ibiryo.","en":"Plants use sunlight, water, and air to grow and make food.","sw":"Mimea hutumia mwanga wa jua, maji na hewa kukua na kutengeneza chakula.","fr":"Les plantes utilisent la lumière du soleil, l’eau et l’air pour grandir et produire leur nourriture."}',1);

insert into public.exams (id,subject_id,title,description,duration_minutes,sort_order) values
('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 '{"rw":"Ikizamini cy’imibare","en":"Maths mini-exam","sw":"Jaribio la hisabati","fr":"Mini-examen de maths"}',
 '{"rw":"Ibibazo byo kwimenyereza imibare y’ibanze.","en":"A short check-in on number patterns.","sw":"Jaribio fupi la mifumo ya namba.","fr":"Un petit test sur les suites de nombres."}',10,1)
on conflict (id) do nothing;

insert into public.questions (id,topic_id,question_type,prompt,options,answer,explanation,sort_order) values
('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','exam',
 '{"rw":"Iyo dukuba 6 na 4 tubona iki?","en":"What is 6 multiplied by 4?","sw":"6 ikizidishwa kwa 4 ni ngapi?","fr":"Combien font 6 multiplié par 4 ?"}',
 '{"A":{"rw":"20","en":"20","sw":"20","fr":"20"},"B":{"rw":"22","en":"22","sw":"22","fr":"22"},"C":{"rw":"24","en":"24","sw":"24","fr":"24"},"D":{"rw":"28","en":"28","sw":"28","fr":"28"}}','C',
 '{"rw":"6 inshuro 4 ni 24: 6 + 6 + 6 + 6 = 24.","en":"Six groups of four make 24: 6 + 6 + 6 + 6 = 24.","sw":"Makundi sita ya nne ni 24: 6 + 6 + 6 + 6 = 24.","fr":"Six groupes de quatre font 24 : 6 + 6 + 6 + 6 = 24."}',2)
on conflict (id) do nothing;

insert into public.exam_questions (exam_id,question_id,sort_order) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',1),
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003',2)
on conflict do nothing;
