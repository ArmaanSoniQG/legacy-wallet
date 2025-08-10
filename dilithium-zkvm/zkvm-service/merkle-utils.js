const crypto = require('crypto');

class MerkleTree {
    constructor(leaves) {
        this.leaves = leaves.map(leaf => this.hash(leaf));
        this.tree = this.buildTree(this.leaves);
    }

    hash(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    buildTree(leaves) {
        if (leaves.length === 0) return [];
        if (leaves.length === 1) return [leaves];

        const tree = [leaves];
        let currentLevel = leaves;

        while (currentLevel.length > 1) {
            const nextLevel = [];
            
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                const parent = this.hash(left + right);
                nextLevel.push(parent);
            }
            
            tree.push(nextLevel);
            currentLevel = nextLevel;
        }

        return tree;
    }

    getRoot() {
        return this.tree.length > 0 ? this.tree[this.tree.length - 1][0] : null;
    }

    getProof(leafIndex) {
        if (leafIndex >= this.leaves.length) return null;

        const proof = [];
        let currentIndex = leafIndex;

        for (let level = 0; level < this.tree.length - 1; level++) {
            const currentLevel = this.tree[level];
            const isRightNode = currentIndex % 2 === 1;
            const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

            if (siblingIndex < currentLevel.length) {
                proof.push(currentLevel[siblingIndex]);
            }

            currentIndex = Math.floor(currentIndex / 2);
        }

        return proof;
    }

    static verifyProof(leaf, proof, root) {
        let computedHash = crypto.createHash('sha256').update(leaf).digest('hex');

        for (const proofElement of proof) {
            if (computedHash <= proofElement) {
                computedHash = crypto.createHash('sha256').update(computedHash + proofElement).digest('hex');
            } else {
                computedHash = crypto.createHash('sha256').update(proofElement + computedHash).digest('hex');
            }
        }

        return computedHash === root;
    }
}

function createSessionLeaf(userAddress, message, signature, expiry) {
    const leafData = JSON.stringify({
        user: userAddress,
        message: message,
        signature: signature,
        expiry: expiry,
        timestamp: Date.now()
    });
    return leafData;
}

module.exports = { MerkleTree, createSessionLeaf };