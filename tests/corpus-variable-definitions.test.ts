import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCorpusVariableDefinitions, corpusVariableDefinitionIndex, corpusVariableOptionValue } from '../lib/corpus-variable-definitions.ts';
import { replaceCorpusE3dElementVariables } from '../lib/corpus-s3d-writer.ts';
import { parseCorpusE3d } from '../lib/corpus-s3d.ts';
const text = `// komentar
[t_b]
CAPTION=TIP_SPAJANJA
CATEGORY=TEHNOLOGIJA
TIP=1
NOEDIT=1
color=$0000ff
TIPLOVANJE=0
KONFIRMAT+TIPL=2
[IVERTIM]
Caption=Probna varijabla
TIP=0
`;
test('razdvaja metapodatke od opcija, čuva nazive i kategoriju', () => {
 const definitions = parseCorpusVariableDefinitions(text, 'varvalues.dat');
 assert.equal(definitions.length, 2);
 const definition = definitions[0]!;
 assert.equal(definition.caption, 'TIP_SPAJANJA');
 assert.equal(definition.category, 'TEHNOLOGIJA');
 assert.deepEqual(definition.options, [{label:'TIPLOVANJE',value:'0'}, {label:'KONFIRMAT+TIPL',value:'2'}]);
 assert.equal(definitions[1]!.caption, 'Probna varijabla');
 assert.deepEqual(definitions[1]!.options, []);
});
test('prepoznaje literal bez mijenjanja teksta, a ne pretvara formule u izbor', () => {
 const definition = parseCorpusVariableDefinitions(text, 'test')[0]!;
 assert.equal(corpusVariableOptionValue(definition, '2.0'), '2');
 assert.equal(corpusVariableOptionValue(definition, 'if(A=1;2;0)'), undefined);
 assert.equal(corpusVariableOptionValue(definition, '99'), undefined);
 assert.equal(corpusVariableDefinitionIndex([definition]).get('T_B'), definition);
});
test('konfliktne definicije ne bira proizvoljno', () => {
 const definition = parseCorpusVariableDefinitions(text, 'a')[0]!;
 const conflict = parseCorpusVariableDefinitions('[T_B]\nCAPTION=Drugo\nA=7', 'b')[0]!;
 assert.equal(corpusVariableDefinitionIndex([definition, {...definition, source:'copy'}]).size, 1);
 assert.equal(corpusVariableDefinitionIndex([definition, conflict, definition]).size, 0);
});
test('izbor se čuva kao izvorni broj u E3D uz očuvanje drugih formula i redoslijeda', () => {
 const source = '<ELEMENTFILE><ELEMENT ENAME="Test"><EVAR VAR0="t_b=2" VAR1="IVERTIM=if(A=1;10;20)" CUSTOM="ostaje"/><DASKE/></ELEMENT></ELEMENTFILE>';
 const variables = parseCorpusE3d(source).elements[0]!.variables;
 const before = {...variables};
 const output = replaceCorpusE3dElementVariables(source, [0], {...variables, t_b:'0'});
 const restored = parseCorpusE3d(output).elements[0]!.variables;
 assert.deepEqual(Object.keys(restored), Object.keys(before));
 assert.equal(restored.t_b, '0');
 assert.equal(restored.IVERTIM, before.IVERTIM);
 assert.match(output, /CUSTOM="ostaje"/);
 const undo = replaceCorpusE3dElementVariables(output, [0], before);
 assert.deepEqual(parseCorpusE3d(undo).elements[0]!.variables, before);
});
