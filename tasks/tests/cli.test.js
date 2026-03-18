const fs = require('fs');
const { execCommand, FileTestHelper } = require('cli-testlab');
const Handlebars = require('../../lib');

const cli = 'node ./bin/handlebars.mjs';

expect.extend({
  toEqualWithRelaxedSpace(received, expected) {
    const normalize = (str) =>
      typeof str === 'string'
        ? str
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .filter((line) => line.length > 0)
            .join('\n')
            .trim()
        : str;

    const normalizedReceived = normalize(received);
    const normalizedExpected = normalize(expected);
    const pass = normalizedReceived === normalizedExpected;

    return {
      pass,
      message: () =>
        `Expected output to match with relaxed whitespace.\n\n` +
        `Expected:\n${normalizedExpected}\n\nReceived:\n${normalizedReceived}`,
    };
  },
});

function expectedFile(specPath) {
  return fs.readFileSync(specPath, 'utf-8');
}

describe('bin/handlebars', function () {
  describe('help and version', function () {
    it('--help displays help menu', async function () {
      const result = await execCommand(`${cli} --help`);
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/help.menu.txt')
      );
    });

    it('no arguments displays help menu', async function () {
      const result = await execCommand(`${cli}`);
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/help.menu.txt')
      );
    });

    it('-v prints the compiler version', async function () {
      await execCommand(`${cli} -v`, {
        expectedOutput: Handlebars.VERSION,
      });
    });
  });

  describe('AMD output', function () {
    it('-a produces AMD output', async function () {
      const result = await execCommand(
        `${cli} -a spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.js')
      );
    });

    it('-a -s produces simple AMD output', async function () {
      const result = await execCommand(
        `${cli} -a -s spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.simple.js')
      );
    });

    it('-a -m produces minified AMD output', async function () {
      const result = await execCommand(
        `${cli} -a -m spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.min.js')
      );
    });
  });

  describe('CommonJS output', function () {
    it('-c produces CommonJS output', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars -c`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.common.js')
      );
    });
  });

  describe('namespace', function () {
    it('-n sets custom namespace', async function () {
      const result = await execCommand(
        `${cli} -a -n CustomNamespace.templates spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.namespace.js')
      );
    });

    it('--namespace sets custom namespace', async function () {
      const result = await execCommand(
        `${cli} -a --namespace CustomNamespace.templates spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.namespace.js')
      );
    });

    it('multiple files share a namespace', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars spec/artifacts/empty.handlebars -a -n someNameSpace`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/namespace.amd.js')
      );
    });
  });

  describe('file output', function () {
    let files;

    beforeEach(function () {
      files = new FileTestHelper({ basePath: '.' });
      files.createDir('tmp');
    });

    afterEach(function () {
      files.cleanup();
    });

    it('-f writes output to a file', async function () {
      const outputFile = 'tmp/cli-test-output.js';
      files.registerForCleanup(outputFile);

      await execCommand(
        `${cli} -a -f ${outputFile} spec/artifacts/empty.handlebars`
      );

      expect(files.fileExists(outputFile)).toBe(true);
      const content = files.getFileTextContent(outputFile);
      expect(content).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.amd.js')
      );
    });

    it('--map writes source map and appends sourceMappingURL', async function () {
      const mapFile = 'tmp/cli-test-source.map';
      files.registerForCleanup(mapFile);

      const result = await execCommand(
        `${cli} -i "<div>1</div>" -a -m -N test --map ${mapFile}`
      );

      expect(result.stdout).toContain('sourceMappingURL=');
      expect(files.fileExists(mapFile)).toBe(true);
      const parsed = JSON.parse(files.getFileTextContent(mapFile));
      expect(parsed).toHaveProperty('version', 3);
      expect(parsed).toHaveProperty('sources');
      expect(parsed).toHaveProperty('mappings');
    });
  });

  describe('template options', function () {
    it('-e sets custom extension', async function () {
      const result = await execCommand(
        `${cli} -a -e hbs ./spec/artifacts/non.default.extension.hbs`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/non.default.extension.amd.js')
      );
    });

    it('-p compiles as partial', async function () {
      const result = await execCommand(
        `${cli} -a -p ./spec/artifacts/partial.template.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/partial.template.js')
      );
    });

    it('-r strips root from template names', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/partial.template.handlebars -r spec -a`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.root.amd.js')
      );
    });

    it('-b strips BOM', async function () {
      const result = await execCommand(
        `${cli} ./spec/artifacts/bom.handlebars -b -a`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/bom.amd.js')
      );
    });

    it('-h sets custom handlebar path', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars -h some-path/ -a`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/handlebar.path.amd.js')
      );
    });

    it('-k -o sets known helpers only', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/known.helpers.handlebars -a -k someHelper -k anotherHelper -o`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/non.empty.amd.known.helper.js')
      );
    });
  });

  describe('inline templates', function () {
    it('-i compiles inline template', async function () {
      const result = await execCommand(
        `${cli} -i "<div>hello</div>" -a -N myTemplate`
      );
      expect(result.stdout).toContain("define(['handlebars.runtime']");
      expect(result.stdout).toContain("templates['myTemplate']");
    });

    it('-i compiles multiple inline templates with -N', async function () {
      const result = await execCommand(
        `${cli} -i "<div>1</div>" -i "<div>2</div>" -N firstTemplate -N secondTemplate -a`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.name.amd.js')
      );
    });
  });

  describe('negated boolean flags', function () {
    it('--no-amd negates --amd (issue #1673)', async function () {
      const result = await execCommand(
        `${cli} --amd --no-amd spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toEqualWithRelaxedSpace(
        expectedFile('./spec/expected/empty.common.js')
      );
    });
  });
});
