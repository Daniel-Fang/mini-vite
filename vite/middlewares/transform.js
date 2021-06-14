const fs = require('fs');
const path = require('path');
const { init, parse } = require('es-module-lexer');
const cacheDir = path.join(__dirname, '../../', 'node_modules/.vite');
const compileSFC = require('@vue/compiler-sfc');
const compileDom = require('@vue/compiler-dom');
const MagicString = require('magic-string');


const importAnalysis = async (code) => {
  await init;
  const [imports] = parse(code);
  if (!imports || !imports.length) return code;
  const metaData = require(path.join(cacheDir, '_metadata.json'));
  let transformCode = new MagicString(code);
  imports.forEach((importer) => {
      const { n, s, e } = importer;
      const replacePath = metaData[n] || n;
      transformCode = transformCode.overwrite(s, e, replacePath);
  });
  return transformCode.toString();
};


async function transformMiddleware (req, res, next) {
  if (req.url.endsWith('.js')) {
    const jsPath = path.join(__dirname, '../../', req.url);
    const code = fs.readFileSync(jsPath, 'utf-8');
    res.setHeader('Content-Type', 'application/javascript');
    res.statusCode = 200;
    const transformCode = await importAnalysis(code);
    res.end(transformCode);
  }

  if (req.url.includes('.vue')) {
    const vuePath = path.join(__dirname, '../../', req.url);
    const vueContent =  fs.readFileSync(vuePath, 'utf-8');
    const vueParseContet = compileSFC.parse(vueContent);
    const scriptContent = vueParseContet.descriptor.script.content;
    const replaceScript = scriptContent.replace('export default ', 'const __script = ');
    const tpl = vueParseContet.descriptor.template.content;
    const tplCode = compileDom.compile(tpl, { mode: 'module' }).code;
    const tplCodeReplace = tplCode.replace('export function render(_ctx, _cache)', '__script.render=(_ctx, _cache)=>');
    const code = `
            ${await importAnalysis(replaceScript)}
            ${tplCodeReplace}
            export default __script;
    `;
    res.setHeader('Content-Type', 'application/javascript');
    res.statusCode = 200;
    res.end(await importAnalysis(code));
  }
  next();
}

module.exports = {
  transformMiddleware
}