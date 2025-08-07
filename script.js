class HabitTracker {
    constructor() {
        this.habits = JSON.parse(localStorage.getItem('habits')) || [];
        this.pomodoroStats = JSON.parse(localStorage.getItem('pomodoroStats')) || {
            total: 0,
            today: 0,
            lastDate: null
        };
        
        // Load custom timer settings or use defaults
        this.timerSettings = JSON.parse(localStorage.getItem('timerSettings')) || {
            work: 25,
            shortBreak: 5,
            longBreak: 15
        };
        
        this.timer = {
            minutes: this.timerSettings.work,
            seconds: 0,
            isRunning: false,
            mode: 'work', // work, shortBreak, longBreak
            interval: null
        };

        this.modes = {
            work: { minutes: this.timerSettings.work, label: 'Trabalho' },
            shortBreak: { minutes: this.timerSettings.shortBreak, label: 'Pausa Curta' },
            longBreak: { minutes: this.timerSettings.longBreak, label: 'Pausa Longa' }
        };

        this.categories = {
            commits: { 
                name: 'Commits', 
                icon: 'fas fa-code-branch', 
                color: '#667eea',
                emoji: '💻'
            },
            estudos: { 
                name: 'Estudos', 
                icon: 'fas fa-graduation-cap', 
                color: '#ed8936',
                emoji: '📚'
            },
            trabalho: { 
                name: 'Trabalho', 
                icon: 'fas fa-briefcase', 
                color: '#48bb78',
                emoji: '🏢'
            },
            outros: { 
                name: 'Outros', 
                icon: 'fas fa-star', 
                color: '#9f7aea',
                emoji: '⚡'
            }
        };

        this.currentFilter = 'all';
        this.activeHabit = null; // Track currently active habit
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.analytics = this.loadAnalytics();

        this.init();
    }

    init() {
        this.checkNewDay();
        this.setupEventListeners();
        this.applyTheme(); // Apply saved theme
        this.trackVisit(); // Track page visit
        this.updateModeButtons(); // Update mode buttons with custom times
        this.updateActiveHabitDisplay(); // Initialize active habit display
        this.renderHabits();
        this.updateStats();
        this.updateTimerDisplay();
        this.updatePomodoroStats();
        
        // Debug analytics after initialization
        setTimeout(() => {
            console.log('DevHabits initialized. Analytics debug:');
            this.debugAnalytics();
        }, 1000);
    }

    checkNewDay() {
        const today = new Date().toDateString();
        if (this.pomodoroStats.lastDate !== today) {
            this.pomodoroStats.today = 0;
            this.pomodoroStats.lastDate = today;
            
            // Reset daily completion for habits
            this.habits.forEach(habit => {
                habit.completedToday = false;
            });
            
            this.saveData();
        }
    }

    setupEventListeners() {
        // Timer controls
        document.getElementById('startBtn').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pauseTimer());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTimer());

        // Timer modes
        document.getElementById('workMode').addEventListener('click', () => this.setMode('work'));
        document.getElementById('shortBreakMode').addEventListener('click', () => this.setMode('shortBreak'));
        document.getElementById('longBreakMode').addEventListener('click', () => this.setMode('longBreak'));

        // Habit management
        document.getElementById('addHabitBtn').addEventListener('click', () => this.addHabit());
        document.getElementById('habitInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addHabit();
        });

        // Category filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.setFilter(category);
            });
        });

        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveTimerSettings());
        document.getElementById('resetDefaults').addEventListener('click', () => this.resetDefaultSettings());

        // Time adjustment buttons
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                const isIncrease = e.target.classList.contains('increase');
                this.adjustTime(target, isIncrease);
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('settingsModal');
            if (e.target === modal) {
                this.closeSettingsModal();
            }
        });

        // Prevent form submission on Enter in time inputs
        document.querySelectorAll('.modal input[type="number"]').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.saveTimerSettings();
                }
            });
        });

        // Active habit controls
        document.getElementById('stopHabitBtn').addEventListener('click', () => this.stopActiveHabit());

        // Reset functionality
        document.getElementById('resetAllBtn').addEventListener('click', () => this.openResetModal());
        document.getElementById('closeResetModal').addEventListener('click', () => this.closeResetModal());
        document.getElementById('cancelReset').addEventListener('click', () => this.closeResetModal());
        document.getElementById('confirmReset').addEventListener('click', () => this.performReset());
        
        // Reset confirmation input
        document.getElementById('confirmText').addEventListener('input', (e) => {
            this.validateResetConfirmation(e.target.value);
        });

        // Report generation
        document.getElementById('generateReportBtn').addEventListener('click', () => this.generateDailyReport());

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Analytics
        document.getElementById('analyticsBtn').addEventListener('click', () => this.openAnalyticsModal());
        document.getElementById('closeAnalyticsModal').addEventListener('click', () => this.closeAnalyticsModal());
        document.getElementById('exportAnalytics').addEventListener('click', () => this.exportAnalytics());
        document.getElementById('clearAnalytics').addEventListener('click', () => this.clearAnalytics());

        // Suggestions modal
        document.getElementById('suggestionsBtn').addEventListener('click', () => this.openSuggestionsModal());
        document.getElementById('closeSuggestionsModal').addEventListener('click', () => this.closeSuggestionsModal());
        document.getElementById('cancelSuggestion').addEventListener('click', () => this.closeSuggestionsModal());
        document.getElementById('sendSuggestion').addEventListener('click', () => this.sendSuggestion());
    }

    // Active Habit Methods
    startHabitWithPomodoro(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (!habit || habit.completedToday) return;

        // Stop current timer if running
        if (this.timer.isRunning) {
            this.pauseTimer();
        }

        // Set active habit
        this.activeHabit = habit;
        
        // Set to work mode and start timer
        this.setMode('work');
        this.startTimer();
        
        // Update UI
        this.updateActiveHabitDisplay();
        this.renderHabits();
        
        this.showToast(`Pomodoro iniciado para: ${habit.name}`, 'success');
    }

    stopActiveHabit() {
        if (this.activeHabit) {
            this.pauseTimer();
            this.activeHabit = null;
            this.updateActiveHabitDisplay();
            this.renderHabits();
            this.showToast('Hábito parado', 'info');
        }
    }

    updateActiveHabitDisplay() {
        const activeHabitDiv = document.getElementById('activeHabit');
        const activeHabitName = document.getElementById('activeHabitName');
        
        if (this.activeHabit) {
            activeHabitName.textContent = this.activeHabit.name;
            activeHabitDiv.style.display = 'block';
        } else {
            activeHabitDiv.style.display = 'none';
        }
    }

    // Theme Methods
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.currentTheme);
        
        const icon = document.querySelector('#themeToggle i');
        icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        
        this.showToast(`Tema ${this.currentTheme === 'light' ? 'claro' : 'escuro'} ativado`, 'success');
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Analytics Methods
    loadAnalytics() {
        const stored = localStorage.getItem('devhabits-analytics');
        if (stored) {
            return JSON.parse(stored);
        }
        
        return {
            totalVisits: 0,
            uniqueVisitors: 0,
            dailyVisits: {},
            firstVisit: new Date().toISOString(),
            lastVisit: null,
            sessions: [],
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'Direct',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    saveAnalytics() {
        localStorage.setItem('devhabits-analytics', JSON.stringify(this.analytics));
    }

    trackVisit() {
        try {
            console.log('Tracking visit...');
            const now = new Date();
            const today = now.toDateString();
            const sessionId = this.generateSessionId();
            
            // Update total visits
            this.analytics.totalVisits++;
            this.analytics.lastVisit = now.toISOString();
            
            // Track daily visits
            if (!this.analytics.dailyVisits[today]) {
                this.analytics.dailyVisits[today] = {
                    visits: 0,
                    uniqueVisitors: new Set(),
                    sessions: [],
                    date: today
                };
            }
            
            this.analytics.dailyVisits[today].visits++;
            
            // Track unique visitors (simplified - based on localStorage presence)
            const visitorId = this.getVisitorId();
            this.analytics.dailyVisits[today].uniqueVisitors.add(visitorId);
            
            // Track session
            const session = {
                id: sessionId,
                start: now.toISOString(),
                visitorId: visitorId,
                userAgent: navigator.userAgent,
                referrer: document.referrer || 'Direct',
                url: window.location.href
            };
            
            this.analytics.sessions.push(session);
            this.analytics.dailyVisits[today].sessions.push(session);
            
            // Keep only last 30 days of detailed data
            this.cleanOldAnalytics();
            
            this.saveAnalytics();
            
            console.log('Visit tracked successfully:', {
                totalVisits: this.analytics.totalVisits,
                uniqueVisitors: this.analytics.uniqueVisitors,
                todayVisits: this.analytics.dailyVisits[today].visits
            });
            
            // Track page visibility changes
            this.trackPageVisibility(sessionId);
        } catch (error) {
            console.error('Error tracking visit:', error);
        }
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getVisitorId() {
        let visitorId = localStorage.getItem('devhabits-visitor-id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('devhabits-visitor-id', visitorId);
            this.analytics.uniqueVisitors++;
        }
        return visitorId;
    }

    trackPageVisibility(sessionId) {
        let isVisible = !document.hidden;
        let sessionStart = Date.now();
        
        const updateSession = () => {
            const session = this.analytics.sessions.find(s => s.id === sessionId);
            if (session) {
                session.duration = Date.now() - sessionStart;
                session.end = new Date().toISOString();
                this.saveAnalytics();
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && isVisible) {
                // Page became hidden
                isVisible = false;
                updateSession();
            } else if (!document.hidden && !isVisible) {
                // Page became visible
                isVisible = true;
                sessionStart = Date.now();
            }
        });

        // Update session on page unload
        window.addEventListener('beforeunload', updateSession);
    }

    cleanOldAnalytics() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Remove old daily visits
        Object.keys(this.analytics.dailyVisits).forEach(dateStr => {
            const date = new Date(dateStr);
            if (date < thirtyDaysAgo) {
                delete this.analytics.dailyVisits[dateStr];
            }
        });
        
        // Keep only recent sessions
        this.analytics.sessions = this.analytics.sessions.filter(session => {
            const sessionDate = new Date(session.start);
            return sessionDate >= thirtyDaysAgo;
        });
    }

    openAnalyticsModal() {
        try {
            console.log('Opening analytics modal...');
            const modal = document.getElementById('analyticsModal');
            
            if (!modal) {
                console.error('Analytics modal not found in DOM');
                this.showToast('Erro: Modal de analytics não encontrado', 'error');
                return;
            }
            
            console.log('Rendering analytics data...');
            this.renderAnalyticsData();
            
            console.log('Showing modal...');
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            console.log('Analytics modal opened successfully');
        } catch (error) {
            console.error('Error opening analytics modal:', error);
            this.showToast('Erro ao abrir analytics: ' + error.message, 'error');
        }
    }

    closeAnalyticsModal() {
        const modal = document.getElementById('analyticsModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    renderAnalyticsData() {
        try {
            console.log('Rendering analytics data...');
            const container = document.getElementById('analyticsData');
            
            if (!container) {
                console.error('Analytics data container not found');
                return;
            }
            
            const analytics = this.analytics;
            console.log('Analytics data:', analytics);
            
            // Calculate statistics
            const totalDays = Object.keys(analytics.dailyVisits).length;
            const avgVisitsPerDay = totalDays > 0 ? (analytics.totalVisits / totalDays).toFixed(1) : 0;
            const last7Days = this.getLast7DaysData();
            const last30Days = this.getLast30DaysData();
            
            console.log('Statistics calculated:', { totalDays, avgVisitsPerDay, last7Days: last7Days.length, last30Days: last30Days.length });
            
            container.innerHTML = `
                <div class="analytics-overview">
                    <div class="analytics-card">
                        <div class="analytics-number">${analytics.totalVisits}</div>
                        <div class="analytics-label">Total de Visitas</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-number">${analytics.uniqueVisitors}</div>
                        <div class="analytics-label">Visitantes Únicos</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-number">${totalDays}</div>
                        <div class="analytics-label">Dias com Dados</div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-number">${avgVisitsPerDay}</div>
                        <div class="analytics-label">Média/Dia</div>
                    </div>
                </div>

                <div class="analytics-section">
                    <h4><i class="fas fa-calendar-week"></i> Últimos 7 Dias</h4>
                    <div class="analytics-chart">
                        ${this.renderDailyChart(last7Days)}
                    </div>
                    <div class="analytics-summary">
                        <span><strong>Total:</strong> ${last7Days.reduce((sum, day) => sum + day.visits, 0)} visitas</span>
                        <span><strong>Média:</strong> ${(last7Days.reduce((sum, day) => sum + day.visits, 0) / 7).toFixed(1)}/dia</span>
                    </div>
                </div>

                <div class="analytics-section">
                    <h4><i class="fas fa-calendar-alt"></i> Últimos 30 Dias</h4>
                    <div class="analytics-table">
                        ${this.renderDailyTable(last30Days)}
                    </div>
                </div>

                <div class="analytics-section">
                    <h4><i class="fas fa-info-circle"></i> Informações Técnicas</h4>
                    <div class="analytics-info">
                        <p><strong>Primeira visita:</strong> ${new Date(analytics.firstVisit).toLocaleString('pt-BR')}</p>
                        <p><strong>Última visita:</strong> ${analytics.lastVisit ? new Date(analytics.lastVisit).toLocaleString('pt-BR') : 'N/A'}</p>
                        <p><strong>Fuso horário:</strong> ${analytics.timezone}</p>
                        <p><strong>Referrer:</strong> ${analytics.referrer}</p>
                    </div>
                </div>
            `;
            
            console.log('Analytics data rendered successfully');
        } catch (error) {
            console.error('Error rendering analytics data:', error);
            const container = document.getElementById('analyticsData');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <h4>Erro ao carregar analytics</h4>
                        <p>Ocorreu um erro ao carregar os dados de analytics: ${error.message}</p>
                        <p>Verifique o console para mais detalhes.</p>
                    </div>
                `;
            }
        }
    }

    getLast7DaysData() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayData = this.analytics.dailyVisits[dateStr] || { visits: 0, uniqueVisitors: new Set() };
            days.push({
                date: dateStr,
                shortDate: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                visits: dayData.visits,
                uniqueVisitors: dayData.uniqueVisitors.size || 0
            });
        }
        return days;
    }

    getLast30DaysData() {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayData = this.analytics.dailyVisits[dateStr] || { visits: 0, uniqueVisitors: new Set() };
            if (dayData.visits > 0) {
                days.push({
                    date: dateStr,
                    fullDate: date.toLocaleDateString('pt-BR'),
                    visits: dayData.visits,
                    uniqueVisitors: dayData.uniqueVisitors.size || 0
                });
            }
        }
        return days.reverse();
    }

    renderDailyChart(data) {
        const maxVisits = Math.max(...data.map(d => d.visits), 1);
        
        return `
            <div class="chart-container">
                ${data.map(day => `
                    <div class="chart-bar">
                        <div class="bar" style="height: ${(day.visits / maxVisits) * 100}%" title="${day.visits} visitas em ${day.shortDate}"></div>
                        <div class="bar-label">${day.shortDate}</div>
                        <div class="bar-value">${day.visits}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderDailyTable(data) {
        if (data.length === 0) {
            return '<p class="no-data">Nenhum dado disponível para os últimos 30 dias.</p>';
        }

        return `
            <table class="analytics-table-content">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Visitas</th>
                        <th>Visitantes Únicos</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(day => `
                        <tr>
                            <td>${day.fullDate}</td>
                            <td>${day.visits}</td>
                            <td>${day.uniqueVisitors}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    exportAnalytics() {
        const data = {
            exportDate: new Date().toISOString(),
            analytics: this.analytics,
            summary: {
                totalVisits: this.analytics.totalVisits,
                uniqueVisitors: this.analytics.uniqueVisitors,
                totalDays: Object.keys(this.analytics.dailyVisits).length,
                avgVisitsPerDay: Object.keys(this.analytics.dailyVisits).length > 0 ? 
                    (this.analytics.totalVisits / Object.keys(this.analytics.dailyVisits).length).toFixed(2) : 0
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devhabits-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Analytics exportados com sucesso! 📊', 'success');
    }

    clearAnalytics() {
        if (confirm('Tem certeza que deseja limpar todos os dados de analytics? Esta ação não pode ser desfeita.')) {
            localStorage.removeItem('devhabits-analytics');
            localStorage.removeItem('devhabits-visitor-id');
            this.analytics = this.loadAnalytics();
            this.closeAnalyticsModal();
            this.showToast('Dados de analytics limpos com sucesso! 🗑️', 'success');
        }
    }

    // Debug method for analytics
    debugAnalytics() {
        console.log('=== ANALYTICS DEBUG ===');
        console.log('Analytics object:', this.analytics);
        console.log('Analytics button exists:', !!document.getElementById('analyticsBtn'));
        console.log('Analytics modal exists:', !!document.getElementById('analyticsModal'));
        console.log('Analytics data container exists:', !!document.getElementById('analyticsData'));
        console.log('LocalStorage analytics:', localStorage.getItem('devhabits-analytics'));
        console.log('LocalStorage visitor ID:', localStorage.getItem('devhabits-visitor-id'));
        console.log('========================');
        return this.analytics;
    }

    // Suggestions Methods
    openSuggestionsModal() {
        const modal = document.getElementById('suggestionsModal');
        
        // Clear form
        document.getElementById('suggestionType').value = 'feature';
        document.getElementById('suggestionText').value = '';
        document.getElementById('userEmail').value = '';
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on textarea
        setTimeout(() => document.getElementById('suggestionText').focus(), 100);
    }

    closeSuggestionsModal() {
        const modal = document.getElementById('suggestionsModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    sendSuggestion() {
        const type = document.getElementById('suggestionType').value;
        const text = document.getElementById('suggestionText').value.trim();
        const email = document.getElementById('userEmail').value.trim();

        if (!text) {
            this.showToast('Por favor, descreva sua sugestão.', 'error');
            return;
        }

        // Show loading state
        const sendBtn = document.getElementById('sendSuggestion');
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        sendBtn.disabled = true;

        // Check if EmailJS is configured
        if (typeof EMAILJS_CONFIG === 'undefined' || 
            EMAILJS_CONFIG.PUBLIC_KEY === "YOUR_PUBLIC_KEY_HERE") {
            
            // EmailJS not configured, save locally
            this.saveSuggestionLocally({
                type: type,
                text: text,
                email: email,
                timestamp: new Date().toISOString(),
                sent: false,
                note: 'EmailJS não configurado - salvo localmente'
            });
            
            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            this.closeSuggestionsModal();
            this.showToast('Sugestão salva! Configure o EmailJS para envio automático por email.', 'info');
            return;
        }

        // Prepare email data
        const emailData = {
            to_email: 'aluiza.primo@gmail.com',
            from_name: email || 'Usuário DevHabits',
            reply_to: email || 'noreply@devhabits.com',
            suggestion_type: this.getSuggestionTypeLabel(type),
            suggestion_text: text,
            user_email: email || 'Não informado',
            timestamp: new Date().toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            user_agent: navigator.userAgent,
            subject: `[DevHabits] ${this.getSuggestionTypeLabel(type)}`
        };

        // Initialize EmailJS
        emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);

        // Send email
        emailjs.send(EMAILJS_CONFIG.SERVICE_ID, EMAILJS_CONFIG.TEMPLATE_ID, emailData)
            .then(() => {
                // Success
                this.closeSuggestionsModal();
                this.showToast('Sugestão enviada com sucesso para aluiza.primo@gmail.com! 📧', 'success');
                
                // Save locally as backup
                this.saveSuggestionLocally({
                    type: type,
                    text: text,
                    email: email,
                    timestamp: new Date().toISOString(),
                    sent: true,
                    sentTo: 'aluiza.primo@gmail.com'
                });
            })
            .catch((error) => {
                console.error('Erro ao enviar email:', error);
                
                // Fallback: save locally and show alternative message
                this.saveSuggestionLocally({
                    type: type,
                    text: text,
                    email: email,
                    timestamp: new Date().toISOString(),
                    sent: false,
                    error: error.text || 'Erro desconhecido'
                });
                
                this.closeSuggestionsModal();
                this.showToast('Erro no envio. Sugestão salva localmente. Tente novamente mais tarde.', 'error');
            })
            .finally(() => {
                // Restore button state
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
            });
    }

    getSuggestionTypeLabel(type) {
        const labels = {
            'feature': 'Nova Funcionalidade',
            'improvement': 'Melhoria',
            'bug': 'Bug Report',
            'design': 'Sugestão de Design',
            'other': 'Outro'
        };
        return labels[type] || 'Outro';
    }

    saveSuggestionLocally(suggestion) {
        const suggestions = JSON.parse(localStorage.getItem('suggestions') || '[]');
        suggestions.push(suggestion);
        localStorage.setItem('suggestions', JSON.stringify(suggestions));
    }

    // Reset Methods
    openResetModal() {
        const modal = document.getElementById('resetModal');
        const confirmInput = document.getElementById('confirmText');
        const confirmBtn = document.getElementById('confirmReset');
        
        // Reset modal state
        confirmInput.value = '';
        confirmBtn.disabled = true;
        confirmInput.classList.remove('valid');
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Focus on input
        setTimeout(() => confirmInput.focus(), 100);
    }

    closeResetModal() {
        const modal = document.getElementById('resetModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    validateResetConfirmation(value) {
        const confirmBtn = document.getElementById('confirmReset');
        const confirmInput = document.getElementById('confirmText');
        
        if (value.toUpperCase() === 'RESETAR') {
            confirmBtn.disabled = false;
            confirmInput.classList.add('valid');
        } else {
            confirmBtn.disabled = true;
            confirmInput.classList.remove('valid');
        }
    }

    performReset() {
        // Stop any running timer
        if (this.timer.isRunning) {
            this.pauseTimer();
        }

        // Clear all data
        this.habits = [];
        this.activeHabit = null;
        this.pomodoroStats = {
            total: 0,
            today: 0,
            lastDate: null
        };
        this.timerSettings = {
            work: 25,
            shortBreak: 5,
            longBreak: 15
        };

        // Reset timer to default
        this.modes = {
            work: { minutes: 25, label: 'Trabalho' },
            shortBreak: { minutes: 5, label: 'Pausa Curta' },
            longBreak: { minutes: 15, label: 'Pausa Longa' }
        };
        
        this.timer = {
            minutes: 25,
            seconds: 0,
            isRunning: false,
            mode: 'work',
            interval: null
        };

        // Clear localStorage
        localStorage.removeItem('habits');
        localStorage.removeItem('pomodoroStats');
        localStorage.removeItem('timerSettings');
        localStorage.removeItem('devhabits-analytics');
        localStorage.removeItem('devhabits-visitor-id');

        // Reset analytics
        this.analytics = this.loadAnalytics();

        // Update UI
        this.updateModeButtons();
        this.updateActiveHabitDisplay();
        this.renderHabits();
        this.updateStats();
        this.updateTimerDisplay();
        this.updatePomodoroStats();

        // Close modal
        this.closeResetModal();

        // Show success message
        this.showToast('Todos os dados foram resetados! Aplicação limpa e pronta para uso. ✨', 'success');
    }

    // Report Generation Methods
    generateDailyReport() {
        this.showToast('Gerando relatório...', 'info');
        this.setupCanvasPolyfill();
        
        setTimeout(() => {
            try {
                this.createStoryImage();
            } catch (error) {
                console.error('Erro ao gerar relatório:', error);
                this.showToast('Erro ao gerar relatório. Tente novamente.', 'error');
            }
        }, 500);
    }

    createStoryImage() {
        const canvas = document.getElementById('reportCanvas');
        const ctx = canvas.getContext('2d');
        
        // Dimensões do Instagram Story (9:16)
        const width = 1080;
        const height = 1920;
        
        // Limpar canvas
        ctx.clearRect(0, 0, width, height);
        
        // Criar gradiente de fundo
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Configurações de texto
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        
        // Título principal
        ctx.font = 'bold 80px Arial';
        ctx.fillText('DevHabits', width/2, 150);
        
        // Subtítulo
        ctx.font = '40px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('Relatório Diário', width/2, 220);
        
        // Data
        const today = new Date();
        const dateStr = today.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        ctx.font = '32px Arial';
        ctx.fillText(dateStr, width/2, 280);
        
        // Estatísticas principais
        this.drawStats(ctx, width, height);
        
        // Hábitos do dia
        this.drawHabits(ctx, width, height);
        
        // Pomodoros
        this.drawPomodoroStats(ctx, width, height);
        
        // Rodapé
        this.drawFooter(ctx, width, height);
        
        // Baixar imagem
        this.downloadImage(canvas);
    }

    drawStats(ctx, width, height) {
        const completedToday = this.habits.filter(h => h.completedToday).length;
        const totalHabits = this.habits.length;
        const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
        const currentStreak = this.calculateCurrentStreak();
        
        // Fundo das estatísticas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, 350, width - 160, 200, 20);
        ctx.fill();
        
        // Título da seção
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('📊 Estatísticas', width/2, 410);
        
        // Estatísticas em linha
        ctx.font = '36px Arial';
        const statsY = 480;
        
        // Hábitos concluídos
        ctx.fillText(`✅ ${completedToday}/${totalHabits} Hábitos`, width/2, statsY);
        
        // Taxa de conclusão
        ctx.fillText(`📈 ${completionRate}% Conclusão`, width/2, statsY + 50);
        
        // Sequência atual
        if (currentStreak > 0) {
            ctx.fillText(`🔥 ${currentStreak} dias de sequência`, width/2, statsY + 100);
        }
    }

    drawHabits(ctx, width, height) {
        const completedHabits = this.habits.filter(h => h.completedToday);
        const pendingHabits = this.habits.filter(h => !h.completedToday);
        
        let currentY = 620;
        
        // Hábitos concluídos
        if (completedHabits.length > 0) {
            ctx.fillStyle = 'rgba(72, 187, 120, 0.2)';
            const completedHeight = Math.min(completedHabits.length * 60 + 100, 400);
            this.roundRect(ctx, 80, currentY, width - 160, completedHeight, 20);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 42px Arial';
            ctx.fillText('✅ Concluídos Hoje', width/2, currentY + 60);
            
            ctx.font = '32px Arial';
            ctx.textAlign = 'left';
            
            completedHabits.slice(0, 5).forEach((habit, index) => {
                const category = this.categories[habit.category] || this.categories.outros;
                const text = `${category.emoji} ${habit.name}`;
                const maxWidth = width - 200;
                const truncatedText = this.truncateText(ctx, text, maxWidth);
                
                ctx.fillText(truncatedText, 120, currentY + 120 + (index * 50));
            });
            
            if (completedHabits.length > 5) {
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(`+${completedHabits.length - 5} outros...`, width/2, currentY + completedHeight - 30);
            }
            
            currentY += completedHeight + 40;
        }
        
        // Hábitos pendentes
        if (pendingHabits.length > 0 && currentY < height - 400) {
            ctx.fillStyle = 'rgba(245, 101, 101, 0.2)';
            const pendingHeight = Math.min(pendingHabits.length * 60 + 100, 300);
            this.roundRect(ctx, 80, currentY, width - 160, pendingHeight, 20);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 42px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⏳ Pendentes', width/2, currentY + 60);
            
            ctx.font = '32px Arial';
            ctx.textAlign = 'left';
            
            pendingHabits.slice(0, 4).forEach((habit, index) => {
                const category = this.categories[habit.category] || this.categories.outros;
                const text = `${category.emoji} ${habit.name}`;
                const maxWidth = width - 200;
                const truncatedText = this.truncateText(ctx, text, maxWidth);
                
                ctx.fillText(truncatedText, 120, currentY + 120 + (index * 50));
            });
            
            if (pendingHabits.length > 4) {
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(`+${pendingHabits.length - 4} outros...`, width/2, currentY + pendingHeight - 30);
            }
        }
    }

    drawPomodoroStats(ctx, width, height) {
        // Fundo dos Pomodoros
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(ctx, 80, height - 350, width - 160, 150, 20);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🍅 Pomodoros', width/2, height - 290);
        
        ctx.font = '36px Arial';
        ctx.fillText(`Hoje: ${this.pomodoroStats.today} | Total: ${this.pomodoroStats.total}`, width/2, height - 240);
    }

    drawFooter(ctx, width, height) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Gerado pelo DevHabits', width/2, height - 80);
        ctx.fillText('Habit Tracker para Programadores', width/2, height - 40);
    }

    truncateText(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        return truncated + '...';
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    downloadImage(canvas) {
        // Criar link de download
        const link = document.createElement('a');
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        link.download = `devhabits-relatorio-${dateStr}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        
        // Simular clique para baixar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Relatório baixado com sucesso! 📸', 'success');
    }

    setupCanvasPolyfill() {
        // Polyfill já implementado no método roundRect acima
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        
        // Load current settings into inputs
        document.getElementById('workTime').value = this.timerSettings.work;
        document.getElementById('shortBreakTime').value = this.timerSettings.shortBreak;
        document.getElementById('longBreakTime').value = this.timerSettings.longBreak;
        
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    adjustTime(target, isIncrease) {
        const input = document.getElementById(target);
        let currentValue = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        
        if (isIncrease && currentValue < max) {
            input.value = currentValue + 1;
        } else if (!isIncrease && currentValue > min) {
            input.value = currentValue - 1;
        }
    }

    saveTimerSettings() {
        const workTime = parseInt(document.getElementById('workTime').value);
        const shortBreakTime = parseInt(document.getElementById('shortBreakTime').value);
        const longBreakTime = parseInt(document.getElementById('longBreakTime').value);

        // Validate inputs
        if (workTime < 1 || workTime > 60 || 
            shortBreakTime < 1 || shortBreakTime > 30 || 
            longBreakTime < 1 || longBreakTime > 60) {
            alert('Por favor, insira valores válidos para os tempos.');
            return;
        }

        // Update settings
        this.timerSettings = {
            work: workTime,
            shortBreak: shortBreakTime,
            longBreak: longBreakTime
        };

        // Update modes
        this.modes = {
            work: { minutes: workTime, label: 'Trabalho' },
            shortBreak: { minutes: shortBreakTime, label: 'Pausa Curta' },
            longBreak: { minutes: longBreakTime, label: 'Pausa Longa' }
        };

        // Update mode buttons text
        this.updateModeButtons();

        // Reset current timer if not running
        if (!this.timer.isRunning) {
            this.timer.minutes = this.modes[this.timer.mode].minutes;
            this.timer.seconds = 0;
            this.updateTimerDisplay();
        }

        // Save to localStorage
        localStorage.setItem('timerSettings', JSON.stringify(this.timerSettings));

        this.closeSettingsModal();
        
        // Show success message
        this.showToast('Configurações salvas com sucesso!', 'success');
    }

    resetDefaultSettings() {
        document.getElementById('workTime').value = 25;
        document.getElementById('shortBreakTime').value = 5;
        document.getElementById('longBreakTime').value = 15;
    }

    updateModeButtons() {
        document.getElementById('workMode').textContent = `Trabalho (${this.timerSettings.work}min)`;
        document.getElementById('shortBreakMode').textContent = `Pausa Curta (${this.timerSettings.shortBreak}min)`;
        document.getElementById('longBreakMode').textContent = `Pausa Longa (${this.timerSettings.longBreak}min)`;
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
    startTimer() {
        if (!this.timer.isRunning) {
            this.timer.isRunning = true;
            document.querySelector('.timer-display').classList.add('active');
            
            this.timer.interval = setInterval(() => {
                if (this.timer.seconds === 0) {
                    if (this.timer.minutes === 0) {
                        this.timerComplete();
                        return;
                    }
                    this.timer.minutes--;
                    this.timer.seconds = 59;
                } else {
                    this.timer.seconds--;
                }
                this.updateTimerDisplay();
            }, 1000);
        }
    }

    pauseTimer() {
        this.timer.isRunning = false;
        document.querySelector('.timer-display').classList.remove('active');
        clearInterval(this.timer.interval);
    }

    resetTimer() {
        this.pauseTimer();
        this.timer.minutes = this.modes[this.timer.mode].minutes;
        this.timer.seconds = 0;
        this.updateTimerDisplay();
    }

    setMode(mode) {
        this.pauseTimer();
        this.timer.mode = mode;
        this.timer.minutes = this.modes[mode].minutes;
        this.timer.seconds = 0;
        this.updateTimerDisplay();
        
        // Update active mode button
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(mode + 'Mode').classList.add('active');
    }

    timerComplete() {
        this.pauseTimer();
        
        // Play notification sound (you can add audio file)
        this.showNotification();
        
        if (this.timer.mode === 'work') {
            this.pomodoroStats.total++;
            this.pomodoroStats.today++;
            this.updatePomodoroStats();
            
            // If there's an active habit, ask if user wants to complete it
            if (this.activeHabit) {
                const shouldComplete = confirm(
                    `Pomodoro concluído para "${this.activeHabit.name}"!\n\nDeseja marcar este hábito como concluído?`
                );
                
                if (shouldComplete) {
                    this.completeHabit(this.activeHabit.id);
                }
                
                // Clear active habit after work session
                this.activeHabit = null;
                this.updateActiveHabitDisplay();
            }
        }
        
        // Auto switch to break mode
        if (this.timer.mode === 'work') {
            this.setMode('shortBreak');
        } else {
            this.setMode('work');
        }
        
        this.renderHabits();
        this.saveData();
    }

    updateTimerDisplay() {
        const display = document.getElementById('timer');
        const minutes = this.timer.minutes.toString().padStart(2, '0');
        const seconds = this.timer.seconds.toString().padStart(2, '0');
        display.textContent = `${minutes}:${seconds}`;
    }

    updatePomodoroStats() {
        document.getElementById('pomodorosToday').textContent = this.pomodoroStats.today;
        document.getElementById('totalPomodoros').textContent = this.pomodoroStats.total;
    }

    showNotification() {
        if (Notification.permission === 'granted') {
            const message = this.timer.mode === 'work' 
                ? 'Pomodoro concluído! Hora de fazer uma pausa.' 
                : 'Pausa terminada! Hora de voltar ao trabalho.';
            
            new Notification('DevHabits', {
                body: message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        
        // Visual notification
        alert(this.timer.mode === 'work' 
            ? 'Pomodoro concluído! Hora de fazer uma pausa.' 
            : 'Pausa terminada! Hora de voltar ao trabalho.');
    }

    // Habit Methods
    addHabit() {
        const input = document.getElementById('habitInput');
        const categorySelect = document.getElementById('habitCategory');
        const habitName = input.value.trim();
        const category = categorySelect.value;
        
        if (habitName) {
            const habit = {
                id: Date.now(),
                name: habitName,
                category: category,
                createdDate: new Date().toDateString(),
                completedToday: false,
                streak: 0,
                bestStreak: 0,
                totalCompletions: 0,
                completionHistory: []
            };
            
            this.habits.push(habit);
            input.value = '';
            this.renderHabits();
            this.updateStats();
            this.saveData();
        }
    }

    setFilter(category) {
        this.currentFilter = category;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.renderHabits();
    }

    getFilteredHabits() {
        if (this.currentFilter === 'all') {
            return this.habits;
        }
        return this.habits.filter(habit => habit.category === this.currentFilter);
    }

    completeHabit(habitId) {
        const habit = this.habits.find(h => h.id === habitId);
        if (habit && !habit.completedToday) {
            habit.completedToday = true;
            habit.totalCompletions++;
            habit.streak++;
            habit.bestStreak = Math.max(habit.bestStreak, habit.streak);
            habit.completionHistory.push(new Date().toDateString());
            
            this.renderHabits();
            this.updateStats();
            this.saveData();
        }
    }

    deleteHabit(habitId) {
        if (confirm('Tem certeza que deseja excluir este hábito?')) {
            this.habits = this.habits.filter(h => h.id !== habitId);
            this.renderHabits();
            this.updateStats();
            this.saveData();
        }
    }

    renderHabits() {
        const container = document.getElementById('habitsList');
        const filteredHabits = this.getFilteredHabits();
        
        if (filteredHabits.length === 0) {
            if (this.habits.length === 0) {
                // No habits at all - show welcome message
                container.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon">
                            <i class="fas fa-rocket"></i>
                        </div>
                        <h3>Bem-vindo ao DevHabits! 🚀</h3>
                        <p>Você ainda não criou nenhum hábito. Que tal começar agora?</p>
                        <div class="welcome-suggestions">
                            <h4>💡 Sugestões para programadores:</h4>
                            <ul>
                                <li>📝 Fazer commits diários no GitHub</li>
                                <li>📚 Estudar uma nova tecnologia por 30min</li>
                                <li>🔍 Fazer code review de colegas</li>
                                <li>📖 Ler documentação técnica</li>
                                <li>🧪 Escrever testes para o código</li>
                            </ul>
                        </div>
                        <p class="welcome-cta">
                            <i class="fas fa-arrow-up"></i>
                            Use o formulário acima para criar seu primeiro hábito!
                        </p>
                    </div>
                `;
            } else {
                // Has habits but none match filter
                const filterText = `Nenhum hábito na categoria "${this.categories[this.currentFilter]?.name || 'Todos'}".`;
                container.innerHTML = `
                    <div class="no-habits-message">
                        <i class="fas fa-filter"></i>
                        <p>${filterText}</p>
                        <p>Tente selecionar "Todos" ou criar um novo hábito nesta categoria.</p>
                    </div>
                `;
            }
            return;
        }
        
        container.innerHTML = filteredHabits.map(habit => {
            const category = this.categories[habit.category] || this.categories.outros;
            const isActiveHabit = this.activeHabit && this.activeHabit.id === habit.id;
            const canStartPomodoro = !habit.completedToday && !isActiveHabit && !this.timer.isRunning;
            
            return `
                <div class="habit-item ${habit.completedToday ? 'completed' : ''} ${habit.category} ${isActiveHabit ? 'active-habit-item' : ''} fade-in">
                    <div class="habit-category-badge ${habit.category}">
                        ${category.emoji} ${category.name}
                    </div>
                    <div class="habit-info">
                        <div class="habit-name">
                            ${habit.completedToday ? '<i class="fas fa-check-circle" style="color: #48bb78; margin-right: 8px;"></i>' : ''}
                            ${isActiveHabit ? '<i class="fas fa-play-circle" style="color: #667eea; margin-right: 8px; animation: pulse 2s infinite;"></i>' : ''}
                            <i class="${category.icon}" style="color: ${category.color}; margin-right: 8px;"></i>
                            ${habit.name}
                        </div>
                        <div class="habit-streak">
                            <i class="fas fa-fire"></i> Sequência: ${habit.streak} dias | 
                            <i class="fas fa-trophy"></i> Melhor: ${habit.bestStreak} dias |
                            <i class="fas fa-calendar-check"></i> Total: ${habit.totalCompletions}
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="habit-btn start-habit-btn" 
                                onclick="habitTracker.startHabitWithPomodoro(${habit.id})"
                                ${!canStartPomodoro ? 'disabled' : ''}
                                title="${!canStartPomodoro ? 'Não disponível' : 'Iniciar Pomodoro para este hábito'}">
                            <i class="fas fa-play"></i> ${isActiveHabit ? 'Ativo' : 'Iniciar'}
                        </button>
                        <button class="habit-btn complete-btn" 
                                onclick="habitTracker.completeHabit(${habit.id})"
                                ${habit.completedToday ? 'disabled' : ''}>
                            <i class="fas fa-check"></i> ${habit.completedToday ? 'Concluído' : 'Concluir'}
                        </button>
                        <button class="habit-btn delete-btn" 
                                onclick="habitTracker.deleteHabit(${habit.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const completedToday = this.habits.filter(h => h.completedToday).length;
        const currentStreak = this.calculateCurrentStreak();
        const bestStreak = Math.max(...this.habits.map(h => h.bestStreak), 0);
        const completionRate = this.habits.length > 0 
            ? Math.round((completedToday / this.habits.length) * 100) 
            : 0;

        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('currentStreak').textContent = currentStreak;
        document.getElementById('bestStreak').textContent = bestStreak;
        document.getElementById('completionRate').textContent = completionRate + '%';
    }

    calculateCurrentStreak() {
        if (this.habits.length === 0) return 0;
        
        const today = new Date().toDateString();
        let streak = 0;
        let checkDate = new Date();
        
        while (true) {
            const dateStr = checkDate.toDateString();
            const completedOnDate = this.habits.every(habit => 
                habit.completionHistory.includes(dateStr) || 
                (dateStr === today && habit.completedToday)
            );
            
            if (completedOnDate) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    saveData() {
        localStorage.setItem('habits', JSON.stringify(this.habits));
        localStorage.setItem('pomodoroStats', JSON.stringify(this.pomodoroStats));
        localStorage.setItem('timerSettings', JSON.stringify(this.timerSettings));
    }
}

// Initialize the application
const habitTracker = new HabitTracker();

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
