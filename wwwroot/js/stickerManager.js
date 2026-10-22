import { BarcodeService } from './barcodeService.js';

export class StickerManager {
    constructor() {
        this.state = {
            orgName: 'وزارة البيئة والمياه والزراعة',
            deptName: 'إدارة الاتصالات الإدارية',
            logoSrc: '/images/saudiaLogo.png',
            txType: 'outgoing',
            txNumber: '211',
            txDate: '28/09/2026-17/04/1448',
            attachments: 'بدون',
            branch: 'فرع منطقة حائل',
            position: { left: 20, top: 20 },
            preset: 'top-left'
        };

        this.dom = {
            stickerCard: null,
            stickerDragHandle: null,
            overlayContainer: null,
            barcodeSvg: null,
            stickerLogoImg: null,
            logoFileInput: null,
            btnTxOutgoing: null,
            btnTxIncoming: null,
            inputTxNumber: null,
            inputTxDate: null,
            btnTodayDate: null,
            inputAttachments: null,
            inputBranch: null,
            inputOrgName: null,
            inputDeptName: null,
            stampTypeBadge: null,
            stampTypeText: null,
            stampOrgNameDisplay: null,
            stampDeptNameDisplay: null,
            stampNumberLabel: null,
            stampNumberDisplay: null,
            stampDateDisplay: null,
            stampAttachDisplay: null,
            stampBranchDisplay: null
        };

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.cachedContainerRect = null;
        this.cachedCardWidth = 285;
        this.cachedCardHeight = 190;

        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
    }

    init() {
        this.loadSavedState();
        this.cacheDomElements();
        this.syncInputsWithState();
        this.bindEvents();
        this.updateStickerDisplay();
        this.renderBarcode();
        this.applyPosition();

        if (this.state.preset) {
            this.syncPresetButtonsUI(this.state.preset);
        }
    }

    loadSavedState() {
        try {
            const saved = localStorage.getItem('sticker_state_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = Object.assign(this.state, parsed);
            }
        } catch (e) {
            console.warn('Could not load saved sticker state:', e);
        }
    }

    persistState() {
        try {
            localStorage.setItem('sticker_state_v1', JSON.stringify(this.state));
        } catch (e) {
            console.warn('Could not persist sticker state:', e);
        }
    }

    cacheDomElements() {
        this.dom.stickerCard = document.getElementById('stickerCard');
        this.dom.stickerDragHandle = document.getElementById('stickerDragHandle');
        this.dom.overlayContainer = document.getElementById('stickerOverlayContainer');
        this.dom.barcodeSvg = document.getElementById('stickerBarcodeSvg');
        this.dom.stickerLogoImg = document.getElementById('stickerLogoImg');
        this.dom.logoFileInput = document.getElementById('stickerLogoFileInput');

        this.dom.btnTxOutgoing = document.getElementById('btnTxOutgoing');
        this.dom.btnTxIncoming = document.getElementById('btnTxIncoming');
        this.dom.inputTxNumber = document.getElementById('txNumberInput');
        this.dom.inputTxDate = document.getElementById('txDateInput');
        this.dom.btnTodayDate = document.getElementById('btnTodayDate');
        this.dom.inputAttachments = document.getElementById('txAttachmentsInput');
        this.dom.inputBranch = document.getElementById('txBranchInput');
        this.dom.inputOrgName = document.getElementById('txOrgNameInput');
        this.dom.inputDeptName = document.getElementById('txDeptNameInput');

        this.dom.stampTypeBadge = document.getElementById('stickerTypeBadge');
        this.dom.stampTypeText = document.getElementById('stickerTypeText');
        this.dom.stampOrgNameDisplay = document.getElementById('stickerOrgNameDisplay');
        this.dom.stampDeptNameDisplay = document.getElementById('stickerDeptNameDisplay');
        this.dom.stampNumberLabel = document.getElementById('stickerNumberLabel');
        this.dom.stampNumberDisplay = document.getElementById('stickerNumberDisplay');
        this.dom.stampDateDisplay = document.getElementById('stickerDateDisplay');
        this.dom.stampAttachDisplay = document.getElementById('stickerAttachDisplay');
        this.dom.stampBranchDisplay = document.getElementById('stickerBranchDisplay');
    }

    syncInputsWithState() {
        if (this.dom.inputTxNumber) this.dom.inputTxNumber.value = this.state.txNumber;
        if (this.dom.inputTxDate) this.dom.inputTxDate.value = this.state.txDate;
        if (this.dom.inputAttachments) this.dom.inputAttachments.value = this.state.attachments;
        if (this.dom.inputBranch) this.dom.inputBranch.value = this.state.branch;
        if (this.dom.inputOrgName) this.dom.inputOrgName.value = this.state.orgName;
        if (this.dom.inputDeptName) this.dom.inputDeptName.value = this.state.deptName;
        this.updateToggleButtons();
    }

    bindEvents() {
        if (this.dom.btnTxOutgoing) {
            this.dom.btnTxOutgoing.addEventListener('click', () => this.setTransactionType('outgoing'));
        }
        if (this.dom.btnTxIncoming) {
            this.dom.btnTxIncoming.addEventListener('click', () => this.setTransactionType('incoming'));
        }

        if (this.dom.inputTxNumber) {
            this.dom.inputTxNumber.addEventListener('input', (e) => this.handleTxNumberInput(e.target.value));
            this.dom.inputTxNumber.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleTxNumberInput(this.dom.inputTxNumber.value);
                }
            });
        }

        if (this.dom.inputTxDate) {
            this.dom.inputTxDate.addEventListener('input', (e) => this.handleTxDateInput(e.target.value));
        }
        if (this.dom.btnTodayDate) {
            this.dom.btnTodayDate.addEventListener('click', () => this.setTodayDate());
        }

        if (this.dom.inputAttachments) {
            this.dom.inputAttachments.addEventListener('input', (e) => this.handleAttachmentsInput(e.target.value));
        }

        if (this.dom.inputBranch) {
            this.dom.inputBranch.addEventListener('input', (e) => this.handleBranchInput(e.target.value));
        }

        if (this.dom.inputOrgName) {
            this.dom.inputOrgName.addEventListener('input', (e) => this.handleOrgNameInput(e.target.value));
        }

        if (this.dom.inputDeptName) {
            this.dom.inputDeptName.addEventListener('input', (e) => this.handleDeptNameInput(e.target.value));
        }

        if (this.dom.logoFileInput) {
            this.dom.logoFileInput.addEventListener('change', (e) => this.handleLogoFileChange(e));
        }
        const btnChangeLogo = document.getElementById('btnChangeStickerLogo');
        if (btnChangeLogo && this.dom.logoFileInput) {
            btnChangeLogo.addEventListener('click', () => this.dom.logoFileInput.click());
        }
        if (this.dom.stickerLogoImg && this.dom.logoFileInput) {
            this.dom.stickerLogoImg.addEventListener('click', () => this.dom.logoFileInput.click());
        }

        document.querySelectorAll('[data-pos-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.getAttribute('data-pos-preset');
                this.setPositionPreset(preset);
                this.syncPresetButtonsUI(preset);
            });
        });

        if (this.dom.stickerCard) {
            this.dom.stickerCard.addEventListener('mousedown', (e) => this.onDragStart(e));
            this.dom.stickerCard.addEventListener('touchstart', (e) => this.onDragStart(e), { passive: false });
        }
    }

    handleTxNumberInput(value) {
        this.state.txNumber = (value || '').trim();
        this.updateStickerDisplay();
        this.renderBarcode();
    }

    handleTxDateInput(value) {
        this.state.txDate = value;
        this.updateStickerDisplay();
    }

    handleAttachmentsInput(value) {
        this.state.attachments = value;
        this.updateStickerDisplay();
    }

    handleBranchInput(value) {
        this.state.branch = value;
        this.updateStickerDisplay();
    }

    handleOrgNameInput(value) {
        this.state.orgName = value;
        this.updateStickerDisplay();
    }

    handleDeptNameInput(value) {
        this.state.deptName = value;
        this.updateStickerDisplay();
    }

    handleLogoFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.state.logoSrc = e.target.result;
                if (this.dom.stickerLogoImg) {
                    this.dom.stickerLogoImg.src = this.state.logoSrc;
                }
                this.persistState();
            };
            reader.readAsDataURL(file);
        }
    }

    setTransactionType(type) {
        this.state.txType = type;
        this.updateToggleButtons();
        this.updateStickerDisplay();
    }

    updateToggleButtons() {
        if (!this.dom.btnTxOutgoing || !this.dom.btnTxIncoming) return;
        if (this.state.txType === 'outgoing') {
            this.dom.btnTxOutgoing.classList.add('active');
            this.dom.btnTxIncoming.classList.remove('active');
        } else {
            this.dom.btnTxIncoming.classList.add('active');
            this.dom.btnTxOutgoing.classList.remove('active');
        }
    }

    setTodayDate() {
        this.state.txDate = this.generateCurrentHijriGregorianDate();
        if (this.dom.inputTxDate) this.dom.inputTxDate.value = this.state.txDate;
        this.updateStickerDisplay();
    }

    generateCurrentHijriGregorianDate() {
        const now = new Date();
        const gDay = String(now.getDate()).padStart(2, '0');
        const gMonth = String(now.getMonth() + 1).padStart(2, '0');
        const gYear = now.getFullYear();
        const gregorianStr = `${gDay}/${gMonth}/${gYear}`;

        let hijriStr = '';
        try {
            const hijriFormatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const parts = hijriFormatter.formatToParts(now);
            const hDay = parts.find(p => p.type === 'day')?.value || '17';
            const hMonth = parts.find(p => p.type === 'month')?.value || '04';
            const hYear = parts.find(p => p.type === 'year')?.value || '1448';
            hijriStr = `${hDay}/${hMonth}/${hYear}`;
        } catch {
            hijriStr = '17/04/1448';
        }

        return `${gregorianStr}-${hijriStr}`;
    }

    updateStickerDisplay() {
        const isOutgoing = this.state.txType === 'outgoing';

        if (this.dom.stampTypeText) {
            this.dom.stampTypeText.textContent = isOutgoing ? 'صادر' : 'وارد';
        }
        if (this.dom.stampTypeBadge) {
            this.dom.stampTypeBadge.className = `sticker-type-badge ${isOutgoing ? 'outgoing' : 'incoming'}`;
        }
        if (this.dom.stampOrgNameDisplay) {
            this.dom.stampOrgNameDisplay.textContent = this.state.orgName;
        }
        if (this.dom.stampDeptNameDisplay) {
            this.dom.stampDeptNameDisplay.textContent = this.state.deptName;
        }
        if (this.dom.stickerLogoImg) {
            this.dom.stickerLogoImg.src = this.state.logoSrc;
        }
        if (this.dom.stampNumberLabel) {
            this.dom.stampNumberLabel.textContent = isOutgoing ? 'رقم الصادر:' : 'رقم الوارد:';
        }
        if (this.dom.stampNumberDisplay) {
            this.dom.stampNumberDisplay.textContent = this.state.txNumber || '—';
        }
        if (this.dom.stampDateDisplay) {
            this.dom.stampDateDisplay.textContent = this.state.txDate || '—';
        }
        if (this.dom.stampAttachDisplay) {
            this.dom.stampAttachDisplay.textContent = this.state.attachments || 'بدون';
        }
        if (this.dom.stampBranchDisplay) {
            this.dom.stampBranchDisplay.textContent = this.state.branch || '—';
        }

        this.persistState();
    }

    renderBarcode() {
        if (!this.dom.barcodeSvg) return;
        const val = this.state.txNumber || '0';
        BarcodeService.render(this.dom.barcodeSvg, val);
    }

    applyPosition() {
        if (!this.dom.stickerCard) return;
        this.dom.stickerCard.style.left = `${this.state.position.left}px`;
        this.dom.stickerCard.style.top = `${this.state.position.top}px`;
    }

    syncPresetButtonsUI(preset) {
        document.querySelectorAll('[data-pos-preset]').forEach(b => {
            if (b.getAttribute('data-pos-preset') === preset) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    setPositionPreset(preset) {
        if (!this.dom.stickerCard || !this.dom.overlayContainer) return;
        const containerWidth = this.dom.overlayContainer.clientWidth || 600;
        const containerHeight = this.dom.overlayContainer.clientHeight || 800;
        const cardWidth = this.dom.stickerCard.offsetWidth || 285;
        const cardHeight = this.dom.stickerCard.offsetHeight || 190;
        const padding = 20;

        switch (preset) {
            case 'top-left':
                this.state.position = { left: padding, top: padding };
                break;
            case 'top-center':
                this.state.position = {
                    left: Math.max(0, Math.floor((containerWidth - cardWidth) / 2)),
                    top: padding
                };
                break;
            case 'top-right':
                this.state.position = { left: Math.max(0, containerWidth - cardWidth - padding), top: padding };
                break;
            case 'bottom-left':
                this.state.position = { left: padding, top: Math.max(0, containerHeight - cardHeight - padding) };
                break;
            case 'bottom-center':
                this.state.position = {
                    left: Math.max(0, Math.floor((containerWidth - cardWidth) / 2)),
                    top: Math.max(0, containerHeight - cardHeight - padding)
                };
                break;
            case 'bottom-right':
                this.state.position = {
                    left: Math.max(0, containerWidth - cardWidth - padding),
                    top: Math.max(0, containerHeight - cardHeight - padding)
                };
                break;
            default:
                this.state.position = { left: padding, top: padding };
        }
        this.state.preset = preset;
        this.applyPosition();
        this.persistState();
    }

    onDragStart(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

        let clientX;
        let clientY;
        if (e.type === 'touchstart') {
            const touch = e.touches[0];
            clientX = touch.clientX;
            clientY = touch.clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = this.dom.stickerCard.getBoundingClientRect();
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;

        if (this.dom.overlayContainer) {
            this.cachedContainerRect = this.dom.overlayContainer.getBoundingClientRect();
        }
        this.cachedCardWidth = this.dom.stickerCard.offsetWidth || 285;
        this.cachedCardHeight = this.dom.stickerCard.offsetHeight || 190;

        this.isDragging = true;
        this.dom.stickerCard.classList.add('is-dragging');

        window.addEventListener('mousemove', this.onDragMove);
        window.addEventListener('mouseup', this.onDragEnd);
        window.addEventListener('touchmove', this.onDragMove, { passive: false });
        window.addEventListener('touchend', this.onDragEnd);
    }

    onDragMove(e) {
        if (!this.isDragging || !this.cachedContainerRect) return;
        if (e.cancelable) e.preventDefault();

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

        let left = clientX - this.cachedContainerRect.left - this.dragOffset.x;
        let top = clientY - this.cachedContainerRect.top - this.dragOffset.y;

        const maxLeft = Math.max(0, this.cachedContainerRect.width - this.cachedCardWidth);
        const maxTop = Math.max(0, this.cachedContainerRect.height - this.cachedCardHeight);

        left = Math.max(0, Math.min(left, maxLeft));
        top = Math.max(0, Math.min(top, maxTop));

        this.state.position = { left: Math.round(left), top: Math.round(top) };
        this.applyPosition();
    }

    onDragEnd() {
        this.isDragging = false;
        this.cachedContainerRect = null;
        if (this.dom.stickerCard) {
            this.dom.stickerCard.classList.remove('is-dragging');
        }
        window.removeEventListener('mousemove', this.onDragMove);
        window.removeEventListener('mouseup', this.onDragEnd);
        window.removeEventListener('touchmove', this.onDragMove);
        window.removeEventListener('touchend', this.onDragEnd);
        this.state.preset = null;
        this.syncPresetButtonsUI(null);
        this.persistState();
    }

    getStickerElement() {
        return this.dom.stickerCard;
    }

    getOverlayElement() {
        return this.dom.overlayContainer;
    }

    setVisible(visible) {
        if (!this.dom.stickerCard) {
            this.dom.stickerCard = document.getElementById('stickerCard');
        }
        if (this.dom.stickerCard) {
            this.dom.stickerCard.style.display = visible ? 'block' : 'none';
        }
    }

    isVisible() {
        return this.dom.stickerCard && this.dom.stickerCard.style.display !== 'none';
    }
}
