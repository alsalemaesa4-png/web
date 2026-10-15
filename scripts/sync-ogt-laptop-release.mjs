import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const websiteRoot = path.resolve(__dirname, '..')
const appRoot = path.resolve(websiteRoot, '..', 'vergen OGT.3.4')
const versionFile = path.join(appRoot, 'app_version.json')
const publicUpdateDir = path.join(websiteRoot, 'public', 'updates', 'ogt-laptop')
const externalDownloadRoot = path.join(websiteRoot, 'release_uploads', 'ogt-laptop')
const functionsDownloadReleaseFile = path.join(websiteRoot, 'functions', 'download-release.json')

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '')
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function resetDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true })
    ensureDir(dirPath)
    return
  } catch {
  }
  ensureDir(dirPath)
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name)
    fs.rmSync(entryPath, { recursive: true, force: true })
  }
}

function writeJson(targetPath, payload) {
  ensureDir(path.dirname(targetPath))
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8')
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) {
    return false
  }
  ensureDir(path.dirname(targetPath))
  fs.copyFileSync(sourcePath, targetPath)
  return true
}

const versionInfo = JSON.parse(fs.readFileSync(versionFile, 'utf8').replace(/^\uFEFF/, ''))
const installerFile = path.join(appRoot, 'portable_release', 'installer_ready', 'OGT', 'installer', 'output', versionInfo.installer_filename)
const updatePackageFile = path.join(appRoot, 'portable_release', 'updates', versionInfo.update_package_filename)
const websiteBaseUrl = normalizeBaseUrl(versionInfo.website_base_url)
const downloadsBaseUrl = normalizeBaseUrl(versionInfo.downloads_base_url) || websiteBaseUrl
const publicDownloadsBaseUrl = `${websiteBaseUrl}/updates/ogt-laptop`
const useExternalDownloads = Boolean(downloadsBaseUrl) && downloadsBaseUrl !== websiteBaseUrl
const effectiveDownloadsBaseUrl = useExternalDownloads ? downloadsBaseUrl : publicDownloadsBaseUrl
const effectiveManifestUrl = `${effectiveDownloadsBaseUrl}/manifest.json`

resetDir(publicUpdateDir)
if (useExternalDownloads) {
  resetDir(externalDownloadRoot)
} else {
  ensureDir(externalDownloadRoot)
}

const downloadOutputDir = useExternalDownloads ? externalDownloadRoot : publicUpdateDir
const installerFileName = String(versionInfo.installer_filename || '').trim()
const updatePackageFileName = String(versionInfo.update_package_filename || '').trim()

const installerTargetPath = path.join(downloadOutputDir, installerFileName)
const packageTargetPath = path.join(downloadOutputDir, updatePackageFileName)
if (!useExternalDownloads) {
  copyIfExists(installerFile, installerTargetPath)
  copyIfExists(updatePackageFile, packageTargetPath)
} else {
  copyIfExists(installerFile, installerTargetPath)
  copyIfExists(updatePackageFile, packageTargetPath)
}

const manifest = {
  app_name: versionInfo.app_name || 'OGT Laptop',
  channel: versionInfo.channel || 'stable',
  latest_version: versionInfo.current_version || '0.0.0',
  minimum_supported_version: versionInfo.minimum_supported_version || '0.0.0',
  release_date: versionInfo.release_date || '',
  notes: Array.isArray(versionInfo.release_notes) ? versionInfo.release_notes : [],
  package_type: fs.existsSync(packageTargetPath) ? 'direct_archive' : '',
  package_manifest_url: '',
  package_url: fs.existsSync(packageTargetPath) ? `${effectiveDownloadsBaseUrl}/${updatePackageFileName}` : '',
  package_sha256: fs.existsSync(packageTargetPath) ? sha256File(packageTargetPath) : '',
  installer_type: fs.existsSync(installerTargetPath) ? 'direct_installer' : 'installer_only',
  installer_url: fs.existsSync(installerTargetPath) ? `${effectiveDownloadsBaseUrl}/${installerFileName}` : '',
  installer_sha256: fs.existsSync(installerTargetPath) ? sha256File(installerTargetPath) : '',
}

if (useExternalDownloads) {
  writeJson(path.join(downloadOutputDir, 'manifest.json'), manifest)
}

writeJson(path.join(downloadOutputDir, 'release-channel.json'), {
  app_name: manifest.app_name,
  latest_version: manifest.latest_version,
  downloads_base_url: effectiveDownloadsBaseUrl,
  manifest_url: effectiveManifestUrl,
  installer_url: manifest.installer_url,
  package_url: manifest.package_url,
  installer_filename: installerFileName,
  update_package_filename: updatePackageFileName,
  generated_at: new Date().toISOString(),
})

writeJson(functionsDownloadReleaseFile, {
  app_name: manifest.app_name,
  channel: manifest.channel,
  latest_version: manifest.latest_version,
  release_date: manifest.release_date,
  manifest_url: effectiveManifestUrl,
  website_manifest_url: '',
  downloads_base_url: effectiveDownloadsBaseUrl,
  installer_url: manifest.installer_url,
  generated_at: new Date().toISOString(),
})

console.log(`OGT laptop release metadata synced to ${functionsDownloadReleaseFile}`)
if (useExternalDownloads) {
  console.log(`External direct-download payload prepared in ${externalDownloadRoot}`)
}
