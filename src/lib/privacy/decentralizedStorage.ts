/**
 * T3.5: Decentralized Data Storage
 *
 * Enables data storage across decentralized networks.
 * Simplified implementation supporting IPFS-like concepts.
 */

export interface StorageNode {
  id: string;
  name: string;
  ipfsHash?: string;
  blockchainAddress?: string;
  dataHash: string;
  timestamp: number;
  replicationFactor: number;
}

export interface DecentralizedData {
  id: string;
  contentHash: string;
  storageNodes: StorageNode[];
  encrypted: boolean;
  redundancy: number;
  timestamp: number;
}

const storageNodes: Map<string, StorageNode> = new Map();
const decentralizedData: Map<string, DecentralizedData> = new Map();

/**
 * Register storage node
 */
export function registerStorageNode(
  name: string,
  ipfsHash?: string,
  blockchainAddress?: string
): StorageNode {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const node: StorageNode = {
    id,
    name,
    ipfsHash,
    blockchainAddress,
    dataHash: `hash_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    replicationFactor: 0,
  };

  storageNodes.set(id, node);
  return node;
}

/**
 * Store data decentralized
 */
export function storeDecentralized(
  data: string,
  encrypted: boolean = true,
  redundancy: number = 3
): DecentralizedData {
  const id = `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const contentHash = `hash_${Math.random().toString(36).substr(2, 9)}`;

  const nodes = Array.from(storageNodes.values()).slice(0, redundancy);

  const decentralized: DecentralizedData = {
    id,
    contentHash,
    storageNodes: nodes,
    encrypted,
    redundancy,
    timestamp: Date.now(),
  };

  decentralizedData.set(id, decentralized);

  // Update replication factor
  nodes.forEach(node => {
    node.replicationFactor++;
  });

  return decentralized;
}

/**
 * Get decentralized data
 */
export function getDecentralizedData(dataId: string): DecentralizedData | undefined {
  return decentralizedData.get(dataId);
}

/**
 * Get storage node
 */
export function getStorageNode(nodeId: string): StorageNode | undefined {
  return storageNodes.get(nodeId);
}

/**
 * Get all storage nodes
 */
export function getAllStorageNodes(): StorageNode[] {
  return Array.from(storageNodes.values());
}

/**
 * Get decentralized storage report
 */
export function getDecentralizedStorageReport(): {
  totalNodes: number;
  totalData: number;
  averageRedundancy: number;
  encryptedData: number;
  recommendations: string[];
} {
  const nodes = getAllStorageNodes();
  const data = Array.from(decentralizedData.values());

  const encryptedData = data.filter(d => d.encrypted).length;
  const averageRedundancy = data.length > 0 ? data.reduce((sum, d) => sum + d.redundancy, 0) / data.length : 0;

  const recommendations: string[] = [];

  if (nodes.length < 3) {
    recommendations.push('Add more storage nodes for better redundancy');
  }

  if (encryptedData < data.length) {
    recommendations.push('Enable encryption for all stored data');
  }

  if (averageRedundancy < 3) {
    recommendations.push('Increase redundancy factor for better availability');
  }

  return {
    totalNodes: nodes.length,
    totalData: data.length,
    averageRedundancy,
    encryptedData,
    recommendations,
  };
}

/**
 * Clear decentralized storage data (for testing)
 */
export function clearDecentralizedStorageData(): void {
  storageNodes.clear();
  decentralizedData.clear();
}
