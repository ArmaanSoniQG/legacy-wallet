// Background session precomputation service
const fetch = require('node-fetch');

class SessionPrecomputer {
    constructor() {
        this.precomputedSessions = [];
        this.isPrecomputing = false;
        this.targetPoolSize = 2; // Keep 2 sessions ready
    }

    async start() {
        console.log('🔄 Starting session precomputation service...');
        
        // Initial precomputation
        await this.maintainSessionPool();
        
        // Maintain pool every 30 minutes
        setInterval(() => {
            this.maintainSessionPool();
        }, 30 * 60 * 1000);
    }

    async maintainSessionPool() {
        if (this.isPrecomputing) return;
        
        const needed = this.targetPoolSize - this.precomputedSessions.length;
        if (needed <= 0) return;

        console.log(`⚡ Precomputing ${needed} sessions...`);
        this.isPrecomputing = true;

        try {
            const promises = [];
            for (let i = 0; i < needed; i++) {
                promises.push(this.precomputeSession());
            }
            
            const sessions = await Promise.all(promises);
            this.precomputedSessions.push(...sessions.filter(s => s));
            
            console.log(`✅ Precomputed ${sessions.length} sessions. Pool size: ${this.precomputedSessions.length}`);
        } catch (error) {
            console.error('❌ Session precomputation failed:', error);
        } finally {
            this.isPrecomputing = false;
        }
    }

    async precomputeSession() {
        try {
            // Generate keys
            const keyResponse = await fetch('http://localhost:4000/generate-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!keyResponse.ok) return null;
            
            // Generate proof
            const proofResponse = await fetch('http://localhost:4000/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'precomputed_session_' + Date.now(),
                    privateKey: '0xa8d7b5049c2004e397a5fa3dcf905d121ac02fa8b74e068d421e080c8b459efd'
                })
            });
            
            if (!proofResponse.ok) return null;
            
            const proofData = await proofResponse.json();
            
            return {
                keyData: await keyResponse.json(),
                proofData: proofData,
                timestamp: Date.now()
            };
            
        } catch (error) {
            console.error('Precomputation error:', error);
            return null;
        }
    }

    getPrecomputedSession() {
        if (this.precomputedSessions.length === 0) return null;
        
        const session = this.precomputedSessions.shift();
        console.log(`⚡ Using precomputed session! Pool size now: ${this.precomputedSessions.length}`);
        
        // Trigger background refill
        setTimeout(() => this.maintainSessionPool(), 1000);
        
        return session;
    }
}

module.exports = SessionPrecomputer;