import fs from 'node:fs/promises'
import path from 'node:path'

export interface SkillItem {
  name: string
  title: string
  description: string
  isInstalled?: boolean
}

/**
 * Reads the bundled skills directory in development or production.
 */
export async function listAvailableSkills(appRoot: string, projectPath?: string): Promise<SkillItem[]> {
  const skillsDir = getSkillsDir(appRoot)
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    const validSkills: SkillItem[] = []

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'glide-ui-mockup') continue

      const skillPath = path.join(skillsDir, entry.name)
      const skillMdPath = path.join(skillPath, 'SKILL.md')
      
      let title = entry.name
      let description = 'Instruksi & aturan AI khusus untuk proyek Glide.'

      try {
        const content = await fs.readFile(skillMdPath, 'utf-8')
        
        const frontmatterMatch = content.match(/^---[\s\S]*?---/)
        if (frontmatterMatch) {
          const fmText = frontmatterMatch[0]
          const descMatch = fmText.match(/description:\s*(.+)$/m)
          if (descMatch) {
            description = descMatch[1].trim().replace(/^['"]|['"]$/g, '')
          }
        }

        const firstHeader = content.match(/^#\s+(.+)$/m)
        if (firstHeader) {
          title = firstHeader[1].trim()
        } else {
          title = entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        }
      } catch {
        // Fallback
      }

      let isInstalled = false
      if (projectPath) {
        const destPath = path.join(projectPath, '.agents', 'skills', entry.name)
        isInstalled = await fs.stat(destPath).then(() => true).catch(() => false)
      }

      validSkills.push({
        name: entry.name,
        title,
        description,
        isInstalled
      })
    }

    return validSkills
  } catch {
    return []
  }
}

/**
 * Copies a bundled skill or installs a plugin into the project.
 */
export async function installSkillToProject(
  appRoot: string,
  projectPath: string,
  skillName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // If it's the structure-validator plugin
    if (skillName === 'structure-validator') {
      const { installValidatorPluginFiles } = await import('./validator.ts')
      return await installValidatorPluginFiles(projectPath)
    }

    const srcDir = path.join(getSkillsDir(appRoot), skillName)
    const destDir = path.join(projectPath, '.agents', 'skills', skillName)

    await copyRecursive(srcDir, destDir)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

function getSkillsDir(appRoot: string): string {
  // Vite exposes public assets directly in development and copies them into
  // dist for packaged builds.
  const publicRoot = process.env.VITE_PUBLIC || path.join(appRoot, 'public')
  return path.join(publicRoot, 'skills')
}

/**
 * Helper rekursif copy folder
 */
async function copyRecursive(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}
