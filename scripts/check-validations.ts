import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface ValidationIssue {
  file: string;
  line: number;
  message: string;
}

function checkDtoValidations(filePath: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  let currentClass: string | null = null;
  let currentProperty: string | null = null;

  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name) {
      currentClass = node.name.text;
    } else if (ts.isPropertyDeclaration(node) && node.name) {
      currentProperty = node.name.getText(sourceFile);
    } else if (ts.isDecorator(node) && currentProperty) {
      const decoratorName = node.expression.getText(sourceFile);
      if (decoratorName.startsWith('@ApiProperty')) {
        // Verificar si hay validadores correspondientes
        const propertyNode = node.parent.parent;
        const hasValidators =
          ts.isPropertyDeclaration(propertyNode) &&
          ts
            .getDecorators(propertyNode)
            ?.some(
              (d) =>
                d.expression.getText(sourceFile).includes('Is') ??
                d.expression.getText(sourceFile).includes('Validate'),
            );

        if (!hasValidators) {
          issues.push({
            file: filePath,
            line:
              sourceFile.getLineAndCharacterOfPosition(node.getStart()).line +
              1,
            message: `La propiedad ${currentProperty} en ${currentClass} tiene @ApiProperty pero no tiene validadores`,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

function findDtoFiles(dir: string): string[] {
  const dtoFiles: string[] = [];

  function traverse(currentDir: string) {
    const files = fs.readdirSync(currentDir);

    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (file.endsWith('.dto.ts')) {
        dtoFiles.push(fullPath);
      }
    }
  }

  traverse(dir);
  return dtoFiles;
}

function main() {
  const srcDir = path.join(process.cwd(), 'src');
  const dtoFiles = findDtoFiles(srcDir);
  const allIssues: ValidationIssue[] = [];

  console.log('Verificando validaciones en DTOs...\n');

  for (const file of dtoFiles) {
    const issues = checkDtoValidations(file);
    allIssues.push(...issues);
  }

  if (allIssues.length > 0) {
    console.log('Se encontraron los siguientes problemas:\n');
    allIssues.forEach((issue) => {
      console.log(`Archivo: ${issue.file}`);
      console.log(`Línea: ${issue.line}`);
      console.log(`Mensaje: ${issue.message}\n`);
    });
    process.exit(1);
  } else {
    console.log('No se encontraron problemas con las validaciones.');
  }
}

main();
