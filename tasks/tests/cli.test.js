const { execCommand, FileTestHelper } = require('cli-testlab');
const Handlebars = require('../../lib');

const cli = 'node ./bin/handlebars.js';

describe('bin/handlebars (cli-testlab)', function () {
  describe('help and version', function () {
    it('should display help menu with --help', async function () {
      await execCommand(`${cli} --help`, {
        expectedOutput: [
          'Precompile handlebar templates.',
          'Usage:',
          '--output',
          '--amd',
          '--commonjs',
          '--partial',
          '--extension',
          '--bom',
        ],
      });
    });

    it('should display version with -v', async function () {
      await execCommand(`${cli} -v`, {
        expectedOutput: Handlebars.VERSION,
      });
    });

    it('should display help when no arguments are provided', async function () {
      await execCommand(`${cli}`, {
        expectedOutput: 'Precompile handlebar templates.',
      });
    });
  });

  describe('precompilation output modes', function () {
    it('should precompile a template in AMD mode', async function () {
      const result = await execCommand(
        `${cli} -a spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toContain("define(['handlebars.runtime']");
      expect(result.stdout).toContain("templates['empty']");
    });

    it('should precompile a template in CommonJS mode', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars -c`
      );
      expect(result.stdout).toContain('Handlebars.template');
      expect(result.stdout).not.toContain("define(['handlebars.runtime']");
    });

    it('should precompile in simple mode', async function () {
      const result = await execCommand(
        `${cli} -a -s spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toContain('"compiler"');
      expect(result.stdout).toContain('"main"');
      expect(result.stdout).not.toContain("templates['empty']");
    });

    it('should precompile with minification', async function () {
      const result = await execCommand(
        `${cli} -a -m spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toContain('define(');
      expect(result.stdout).toContain('handlebars.runtime');
    });
  });

  describe('custom namespace', function () {
    it('should use custom namespace with -n', async function () {
      const result = await execCommand(
        `${cli} -a -n CustomNamespace.templates spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toContain('CustomNamespace.templates');
      expect(result.stdout).not.toContain('Handlebars.templates');
    });

    it('should use custom namespace with --namespace', async function () {
      const result = await execCommand(
        `${cli} -a --namespace CustomNamespace.templates spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).toContain('CustomNamespace.templates');
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

    it('should write output to a file with -f', async function () {
      const outputFile = 'tmp/cli-testlab-output.js';
      files.registerForCleanup(outputFile);

      await execCommand(
        `${cli} -a -f ${outputFile} spec/artifacts/empty.handlebars`
      );

      expect(files.fileExists(outputFile)).toBe(true);
      const content = files.getFileTextContent(outputFile);
      expect(content).toContain("define(['handlebars.runtime']");
      expect(content).toContain("templates['empty']");
    });

    it('should generate source map file with --map', async function () {
      const mapFile = 'tmp/cli-testlab-source.map';
      files.registerForCleanup(mapFile);

      await execCommand(
        `${cli} -i "<div>1</div>" -a -m -N test --map ${mapFile}`
      );

      expect(files.fileExists(mapFile)).toBe(true);
      const mapContent = files.getFileTextContent(mapFile);
      const parsed = JSON.parse(mapContent);
      expect(parsed).toHaveProperty('version', 3);
      expect(parsed).toHaveProperty('sources');
      expect(parsed).toHaveProperty('mappings');
    });
  });

  describe('template options', function () {
    it('should support custom extension with -e', async function () {
      const result = await execCommand(
        `${cli} -a -e hbs ./spec/artifacts/non.default.extension.hbs`
      );
      expect(result.stdout).toContain("define(['handlebars.runtime']");
      expect(result.stdout).toContain("templates['non.default.extension']");
    });

    it('should compile as partial with -p', async function () {
      const result = await execCommand(
        `${cli} -a -p ./spec/artifacts/partial.template.handlebars`
      );
      expect(result.stdout).toContain('Handlebars.partials');
    });

    it('should strip root from template names with -r', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/partial.template.handlebars -r spec -a`
      );
      expect(result.stdout).not.toContain("templates['spec/");
    });

    it('should strip BOM with -b', async function () {
      const result = await execCommand(
        `${cli} ./spec/artifacts/bom.handlebars -b -a`
      );
      expect(result.stdout).not.toContain('\uFEFF');
      expect(result.stdout).toContain("define(['handlebars.runtime']");
    });
  });

  describe('inline templates', function () {
    it('should compile inline template with -i', async function () {
      const result = await execCommand(
        `${cli} -i "<div>hello</div>" -a -N myTemplate`
      );
      expect(result.stdout).toContain("define(['handlebars.runtime']");
      expect(result.stdout).toContain("templates['myTemplate']");
    });

    it('should compile multiple inline templates', async function () {
      const result = await execCommand(
        `${cli} -i "<div>1</div>" -i "<div>2</div>" -N first -N second -a`
      );
      expect(result.stdout).toContain("templates['first']");
      expect(result.stdout).toContain("templates['second']");
    });
  });

  describe('known helpers', function () {
    it('should accept known helpers with -k', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/known.helpers.handlebars -a -k someHelper -k anotherHelper -o`
      );
      expect(result.stdout).toContain("define(['handlebars.runtime']");
    });
  });

  describe('handlebar path', function () {
    it('should accept custom handlebar path with -h', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars -h some-path/ -a`
      );
      expect(result.stdout).toContain(
        "define(['some-path/handlebars.runtime']"
      );
    });
  });

  describe('negated boolean flags', function () {
    it('should support --no-amd to negate --amd (issue #1673)', async function () {
      const result = await execCommand(
        `${cli} --amd --no-amd spec/artifacts/empty.handlebars`
      );
      expect(result.stdout).not.toContain("define(['handlebars.runtime']");
      expect(result.stdout).toContain('Handlebars.template');
    });
  });

  describe('multiple files', function () {
    it('should precompile multiple files into a single output', async function () {
      const result = await execCommand(
        `${cli} spec/artifacts/empty.handlebars spec/artifacts/empty.handlebars -a -n someNameSpace`
      );
      expect(result.stdout).toContain('someNameSpace');
      expect(result.stdout).toContain("define(['handlebars.runtime']");
    });
  });
});
