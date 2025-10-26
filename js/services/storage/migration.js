// 🔄 Migration Service - Міграція даних з localStorage в IndexedDB

class MigrationService {
    constructor() {
        this.migrationVersion = 1;
        this.migrationKey = 'migration_version';
        this.backupKey = 'pre_migration_backup';
        this.isRunning = false;
        
        this.migrations = {
            1: this.migrateV1.bind(this)
        };
    }

    // ========================================
    // ГОЛОВНА МІГРАЦІЯ
    // ========================================

    async migrate() {
        if (this.isRunning) {
            console.warn('⚠️ Migration already running');
            return false;
        }

        this.isRunning = true;

        try {
            const currentVersion = this.getCurrentVersion();
            
            console.log(`🔄 Starting migration from v${currentVersion} to v${this.migrationVersion}`);

            await this.createBackup();

            for (let version = currentVersion + 1; version <= this.migrationVersion; version++) {
                const migrationFn = this.migrations[version];
                
                if (migrationFn) {
                    console.log(`🔄 Running migration v${version}...`);
                    await migrationFn();
                    this.setCurrentVersion(version);
                    console.log(`✅ Migration v${version} completed`);
                }
            }

            console.log('✅ All migrations completed successfully');
            
            if (window.showToast) {
                showToast('✅ Дані успішно мігровано!', 'success');
            }

            return true;

        } catch (error) {
            console.error('❌ Migration failed:', error);
            
            await this.restoreFromBackup();

            if (window.showToast) {
                showToast('❌ Помилка міграції. Дані відновлено з backup.', 'error');
            }

            return false;

        } finally {
            this.isRunning = false;
        }
    }

    // ========================================
    // МІГРАЦІЯ V1
    // ========================================

    async migrateV1() {
        console.log('📦 Migrating localStorage data to IndexedDB...');

        let migratedCount = 0;

        const conversations = await this.migrateConversations();
        migratedCount += conversations;
        console.log(`✅ Migrated ${conversations} conversations`);

        const memories = await this.migrateMemories();
        migratedCount += memories;
        console.log(`✅ Migrated ${memories} memories`);

        const plans = await this.migratePlans();
        migratedCount += plans;
        console.log(`✅ Migrated ${plans} plans`);

        console.log(`📊 Total migrated items: ${migratedCount}`);
        return migratedCount;
    }

    async migrateConversations() {
        const saved = localStorage.getItem('saved_conversations');
        if (!saved) return 0;

        try {
            const conversations = JSON.parse(saved);
            if (!Array.isArray(conversations)) return 0;

            let count = 0;

            for (const conv of conversations) {
                try {
                    const validated = {
                        title: conv.title || 'Розмова без назви',
                        mode: conv.mode || 'gemini',
                        messages: Array.isArray(conv.messages) ? conv.messages : [],
                        createdAt: conv.createdAt || conv.date || new Date().toISOString(),
                        favorite: !!conv.favorite,
                        tags: Array.isArray(conv.tags) ? conv.tags : []
                    };
                    
                    if (window.indexedDBService) {
                        await indexedDBService.add(
                            indexedDBService.stores.conversations,
                            validated
                        );
                        count++;
                    }
                } catch (error) {
                    console.error('Failed to migrate conversation:', error);
                }
            }

            localStorage.removeItem('saved_conversations');
            return count;

        } catch (error) {
            console.error('Failed to parse conversations:', error);
            return 0;
        }
    }

    async migrateMemories() {
        const saved = localStorage.getItem('agent_memories');
        if (!saved) return 0;

        try {
            const memories = JSON.parse(saved);
            if (!Array.isArray(memories)) return 0;

            let count = 0;

            for (const memory of memories) {
                try {
                    const validated = {
                        title: memory.title || 'Спогад',
                        content: memory.content || '',
                        category: memory.category || 'загальне',
                        important: !!memory.important,
                        tags: Array.isArray(memory.tags) ? memory.tags : [],
                        created: memory.created || new Date().toISOString()
                    };
                    
                    if (window.indexedDBService) {
                        await indexedDBService.add(
                            indexedDBService.stores.memories,
                            validated
                        );
                        count++;
                    }
                } catch (error) {
                    console.error('Failed to migrate memory:', error);
                }
            }

            localStorage.removeItem('agent_memories');
            return count;

        } catch (error) {
            console.error('Failed to parse memories:', error);
            return 0;
        }
    }

    async migratePlans() {
        const saved = localStorage.getItem('user_plans');
        if (!saved) return 0;

        try {
            const plans = JSON.parse(saved);
            if (!Array.isArray(plans)) return 0;

            let count = 0;

            for (const plan of plans) {
                try {
                    const validated = {
                        title: plan.title || 'План',
                        description: plan.description || '',
                        status: plan.status || 'pending',
                        priority: plan.priority || 'medium',
                        deadline: plan.deadline || null,
                        subtasks: Array.isArray(plan.subtasks) ? plan.subtasks : [],
                        created: plan.created || new Date().toISOString()
                    };
                    
                    if (window.indexedDBService) {
                        await indexedDBService.add(
                            indexedDBService.stores.plans,
                            validated
                        );
                        count++;
                    }
                } catch (error) {
                    console.error('Failed to migrate plan:', error);
                }
            }

            localStorage.removeItem('user_plans');
            return count;

        } catch (error) {
            console.error('Failed to parse plans:', error);
            return 0;
        }
    }

    // ========================================
    // BACKUP
    // ========================================

    async createBackup() {
        console.log('💾 Creating pre-migration backup...');

        try {
            const backup = {
                timestamp: Date.now(),
                data: {}
            };

            const keys = Object.keys(localStorage);
            for (const key of keys) {
                backup.data[key] = localStorage.getItem(key);
            }

            sessionStorage.setItem(this.backupKey, JSON.stringify(backup));
            console.log('✅ Backup created');
            return true;

        } catch (error) {
            console.error('Failed to create backup:', error);
            return false;
        }
    }

    async restoreFromBackup() {
        console.log('🔄 Restoring from backup...');

        try {
            const backupData = sessionStorage.getItem(this.backupKey);
            if (!backupData) return false;

            const backup = JSON.parse(backupData);

            Object.entries(backup.data).forEach(([key, value]) => {
                localStorage.setItem(key, value);
            });

            console.log('✅ Backup restored');
            return true;

        } catch (error) {
            console.error('Failed to restore backup:', error);
            return false;
        }
    }

    // ========================================
    // VERSION MANAGEMENT
    // ========================================

    getCurrentVersion() {
        const version = localStorage.getItem(this.migrationKey);
        return version ? parseInt(version) : 0;
    }

    setCurrentVersion(version) {
        localStorage.setItem(this.migrationKey, version.toString());
    }

    needsMigration() {
        return this.getCurrentVersion() < this.migrationVersion;
    }

    async autoMigrate() {
        if (!this.needsMigration()) {
            console.log('✅ No migration needed');
            return true;
        }

        console.log('🔄 Auto-migration started...');
        return await this.migrate();
    }
}

const migrationService = new MigrationService();

document.addEventListener('DOMContentLoaded', async () => {
    if (window.indexedDBService) {
        await indexedDBService.init();
    }

    if (migrationService.needsMigration()) {
        await migrationService.autoMigrate();
    }
});

window.migrationService = migrationService;

console.log('✅ Migration Service loaded');
