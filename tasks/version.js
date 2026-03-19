const fs = require('fs');
const { execSync } = require('child_process');
const git = require('./util/git');
const semver = require('semver');

async function main() {
  const version = process.argv[2];
  if (!semver.valid(version)) {
    throw new Error(
      'Must provide a valid semver version as first argument (e.g.: node tasks/version.js 1.0.0):\n\t' +
        version +
        '\n\n'
    );
  }

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = version;
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  await git.add('package.json');

  const replaceSpec = [
    {
      path: 'lib/handlebars/base.js',
      regex: /const VERSION = ['"](.*)['"];/,
      replacement: `const VERSION = '${version}';`,
    },
    {
      path: 'components/bower.json',
      regex: /"version":.*/,
      replacement: `"version": "${version}",`,
    },
    {
      path: 'components/package.json',
      regex: /"version":.*/,
      replacement: `"version": "${version}",`,
    },
    {
      path: 'components/handlebars.js.nuspec',
      regex: /<version>.*<\/version>/,
      replacement: `<version>${version}</version>`,
    },
  ];

  await Promise.all(
    replaceSpec.map((spec) =>
      replaceAndAdd(spec.path, spec.regex, spec.replacement)
    )
  );

  execSync('npm run build', { stdio: 'inherit' });
}

async function replaceAndAdd(filePath, regex, value) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(regex, value);
  fs.writeFileSync(filePath, content);
  await git.add(filePath);
}

module.exports = { replaceAndAdd };

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
