const fs = require('fs');
const path = require('path');
const http = require('http');
const connect = require('connect');
const esbuild = require('esbuild');
const cacheDir = path.join(__dirname, '../', 'node_modules/.vite');
const { indexHtmlMiddleware } = require('./middlewares/indexHtml');
const { transformMiddleware } = require('./middlewares/transform');

const middlewares = connect();

const optimizeDeps = async () => {
  if (fs.existsSync(cacheDir)) return false;
  fs.mkdirSync(cacheDir, { recursive: true });
  const deps = Object.keys(require('../package.json').dependencies);
  const result = await esbuild.build({
      entryPoints: deps,
      bundle: true,
      format: 'esm',
      logLevel: 'error',
      splitting: true,
      sourcemap: true,
      outdir: cacheDir,
      treeShaking: 'ignore-annotations',
      metafile: true,
      define: {'process.env.NODE_ENV': "\"development\""}
    });
  const outputs = Object.keys(result.metafile.outputs);
  const data = {};
  deps.forEach((dep) => {
      data[dep] = '/' + outputs.find(output => output.endsWith(`${dep}.js`));
  });
  const dataPath = path.join(cacheDir, '_metadata.json');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

const createServer = async function () {
  await optimizeDeps();
  const server = http.createServer(middlewares);
  return server;
};

middlewares.use(indexHtmlMiddleware);
middlewares.use(transformMiddleware);

async function main () {
  const server = await createServer();
  server.listen(3000, () => {
    console.log('server is starting! listening port 3000');
  });
}

main();
