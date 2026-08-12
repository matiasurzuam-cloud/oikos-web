import { Client, Account, TablesDB } from 'appwrite'

export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID ?? ''
// ID de la colección/tabla (según la versión de tu consola Appwrite) donde vive el documento "plato-del-dia"
export const APPWRITE_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID ?? ''
export const PLATO_DEL_DIA_ROW_ID = 'plato-del-dia'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID

export const isAppwriteConfigured = Boolean(endpoint && projectId && APPWRITE_DATABASE_ID && APPWRITE_COLLECTION_ID)

const client = new Client()
if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId)
}

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
