import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const copyStatic = () => {
  fs.mkdirSync('dist/icons', { recursive: true });
  fs.copyFileSync('src/manifest.json', 'dist/manifest.json');
  for (const f of fs.readdirSync('src/icons')) {
    fs.copyFileSync(path.join('src/icons', f), path.join('dist/icons', f));
  }
};

const ctx = await esbuild.context({
  entryPoints: ['src/content.ts', 'src/content.css'],
  bundle: true,
  outdir: 'dist',
  target: 'chrome149',
  plugins: [{
    name: 'copy-static',
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) copyStatic();
      });
    },
  }],
});

await ctx.rebuild();
await ctx.dispose();
