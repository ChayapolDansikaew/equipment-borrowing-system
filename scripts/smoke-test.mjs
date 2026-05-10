import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
const html = read('index.html');
const requestsJs = read('js/requests.js');
const uiJs = read('js/ui.js');
const dataJs = read('js/data.js');
const dashboardJs = read('js/dashboard.js');
const configJs = read('js/config.js');

const failures = [];
const passGroups = [];

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expect(condition, message) {
    if (!condition) {
        failures.push(message);
    }
}

function recordGroup(name, fn) {
    const before = failures.length;
    fn();
    if (failures.length === before) {
        passGroups.push(name);
    }
}

function hasId(id) {
    return new RegExp(`id=["']${escapeRegExp(id)}["']`).test(html);
}

function hasDataI18n(key) {
    return new RegExp(`data-i18n=["']${escapeRegExp(key)}["']`).test(html);
}

function hasOnclick(functionName) {
    return new RegExp(`onclick=["'][^"']*${escapeRegExp(functionName)}\\(`).test(html);
}

function hasAttribute(id, attribute, value = null) {
    const valuePattern = value === null ? '[^"\']*' : escapeRegExp(value);
    return new RegExp(`id=["']${escapeRegExp(id)}["'][^>]*${escapeRegExp(attribute)}=["']${valuePattern}["']`).test(html);
}

function hasHandler(id, attribute, functionName) {
    return new RegExp(`id=["']${escapeRegExp(id)}["'][^>]*${escapeRegExp(attribute)}=["'][^"']*${escapeRegExp(functionName)}\\(`).test(html);
}

function hasFunction(source, functionName) {
    return new RegExp(
        `window\\.${escapeRegExp(functionName)}\\s*=\\s*(?:(?:async\\s*)?function\\b|${escapeRegExp(functionName)}\\b)`
    ).test(source);
}

function hasIdentifier(source, identifier) {
    return new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(source);
}

function translationKeyCount(key) {
    return (configJs.match(new RegExp(`\\b${escapeRegExp(key)}\\s*:`, 'g')) || []).length;
}

recordGroup('request form modal contracts', () => {
    const ids = [
        'requestFormModal',
        'requestValidationMessage',
        'requestEligibilityRules',
        'requestInlineWarnings',
        'requestSummaryDurationValue',
        'requestSummaryItemsValue',
        'requestSummaryCategoriesValue',
        'requestSubmitBtn'
    ];
    ids.forEach(id => expect(hasId(id), `Missing HTML id: ${id}`));

    const keys = [
        'requestSummaryTitle',
        'requestSummaryHelper',
        'requestSummaryDuration',
        'requestSummaryItems',
        'requestSummaryCategories',
        'requestRulesTitle',
        'requestSyncNotice'
    ];
    keys.forEach(key => expect(hasDataI18n(key), `Missing request form translation binding: ${key}`));

    expect(hasOnclick('submitBorrowRequest'), 'Request submit button is not wired to submitBorrowRequest()');
    expect(hasFunction(requestsJs, 'openRequestForm'), 'Missing window.openRequestForm in js/requests.js');
    expect(hasFunction(requestsJs, 'submitBorrowRequest'), 'Missing window.submitBorrowRequest in js/requests.js');
    expect(hasFunction(requestsJs, 'refreshRequestFormSummary'), 'Missing window.refreshRequestFormSummary in js/requests.js');
    expect(hasIdentifier(requestsJs, 'bindRequestFormEnhancements'), 'Missing bindRequestFormEnhancements helper in js/requests.js');
    expect(hasIdentifier(requestsJs, 'syncRequestDatesToFilters'), 'Missing syncRequestDatesToFilters helper in js/requests.js');
});

recordGroup('reject modal contracts', () => {
    const ids = [
        'rejectReasonModal',
        'rejectReasonTarget',
        'rejectReasonInput',
        'confirmRejectBtn'
    ];
    ids.forEach(id => expect(hasId(id), `Missing HTML id: ${id}`));

    const keys = ['rejectReasonTitle', 'rejectReasonHint', 'confirmReject'];
    keys.forEach(key => expect(hasDataI18n(key), `Missing reject modal translation binding: ${key}`));

    expect(hasOnclick('closeRejectReasonModal'), 'Reject modal is not wired to closeRejectReasonModal()');
    expect(hasOnclick('confirmRejectItem'), 'Reject modal is not wired to confirmRejectItem()');
    expect(hasFunction(requestsJs, 'rejectItem'), 'Missing window.rejectItem in js/requests.js');
    expect(hasFunction(requestsJs, 'closeRejectReasonModal'), 'Missing window.closeRejectReasonModal in js/requests.js');
    expect(hasFunction(requestsJs, 'confirmRejectItem'), 'Missing window.confirmRejectItem in js/requests.js');
});

recordGroup('return modal contracts', () => {
    const ids = [
        'returnModal',
        'returnBorrowerName',
        'returnItemName',
        'returnBorrowedOnValue',
        'returnDueOnValue',
        'returnDecisionMessage',
        'returnDurationValue',
        'returnStatusValue',
        'returnTimingValue',
        'returnDecisionChecklist',
        'returnTransactionId'
    ];
    ids.forEach(id => expect(hasId(id), `Missing HTML id: ${id}`));

    const keys = [
        'returnBorrowerLabel',
        'returnEquipmentLabel',
        'returnDecisionTitle',
        'returnDecisionHelper',
        'returnBorrowedOn',
        'returnDueOn',
        'returnDurationLabel',
        'returnStatusLabel',
        'returnTimingLabel',
        'returnChecklistTitle',
        'returnPenaltyHint',
        'returnPenaltyAction'
    ];
    keys.forEach(key => expect(hasDataI18n(key), `Missing return modal translation binding: ${key}`));

    expect(hasOnclick('closeReturnModal'), 'Return modal is not wired to closeReturnModal()');
    expect(hasOnclick('openReturnPenaltyModal'), 'Return modal is not wired to openReturnPenaltyModal()');
    expect(hasOnclick('confirmReturn'), 'Return modal is not wired to confirmReturn()');
    expect(hasFunction(uiJs, 'openReturnModal'), 'Missing window.openReturnModal in js/ui.js');
    expect(hasFunction(uiJs, 'closeReturnModal'), 'Missing window.closeReturnModal in js/ui.js');
    expect(hasFunction(uiJs, 'openReturnPenaltyModal'), 'Missing window.openReturnPenaltyModal in js/ui.js');
    expect(hasFunction(dataJs, 'confirmReturn'), 'Missing window.confirmReturn in js/data.js');
    expect(hasIdentifier(uiJs, 'populateReturnModal'), 'Missing populateReturnModal helper in js/ui.js');
});

recordGroup('manage modal contracts', () => {
    const ids = [
        'manageModal',
        'manageModeBadge',
        'manageValidationMessage',
        'manageName',
        'manageType',
        'manageImage',
        'manageImagePreview',
        'manageImagePreviewEmpty',
        'manageQuantity',
        'manageSummaryMessage',
        'manageCurrentQuantityValue',
        'managePlannedQuantityValue',
        'manageAvailabilityValue',
        'manageImpactValue',
        'manageDeleteSection',
        'manageDeleteState',
        'manageDeleteBtn',
        'manageSaveBtn',
        'manageOriginalName'
    ];
    ids.forEach(id => expect(hasId(id), `Missing HTML id: ${id}`));

    const keys = [
        'manageHelper',
        'manageNameLabel',
        'manageTypeLabel',
        'manageImageLabel',
        'managePreviewTitle',
        'manageImagePreviewEmpty',
        'manageQuantityLabel',
        'manageSummaryTitle',
        'manageCurrentQuantity',
        'managePlannedQuantity',
        'manageAvailabilityLabel',
        'manageImpactLabel',
        'manageDeleteHint',
        'manageDeleteAction',
        'save'
    ];
    keys.forEach(key => expect(hasDataI18n(key), `Missing manage modal translation binding: ${key}`));

    expect(hasOnclick('closeManageModal'), 'Manage modal is not wired to closeManageModal()');
    expect(hasOnclick('saveEquipment'), 'Manage modal is not wired to saveEquipment()');
    expect(hasOnclick('handleManageDeleteAction'), 'Manage modal is not wired to handleManageDeleteAction()');
    expect(hasFunction(uiJs, 'openManageModal'), 'Missing window.openManageModal in js/ui.js');
    expect(hasFunction(uiJs, 'closeManageModal'), 'Missing window.closeManageModal in js/ui.js');
    expect(hasFunction(uiJs, 'updateManageImagePreview'), 'Missing window.updateManageImagePreview in js/ui.js');
    expect(hasFunction(uiJs, 'getManageModalState'), 'Missing window.getManageModalState in js/ui.js');
    expect(hasFunction(uiJs, 'refreshManageModalState'), 'Missing window.refreshManageModalState in js/ui.js');
    expect(hasFunction(uiJs, 'bindManageModalEvents'), 'Missing window.bindManageModalEvents in js/ui.js');
    expect(hasFunction(uiJs, 'handleManageDeleteAction'), 'Missing window.handleManageDeleteAction in js/ui.js');
    expect(hasFunction(dataJs, 'saveEquipment'), 'Missing window.saveEquipment in js/data.js');
    expect(hasFunction(dataJs, 'deleteEquipmentGroup'), 'Missing window.deleteEquipmentGroup in js/data.js');
});

recordGroup('penalty modal contracts', () => {
    const ids = [
        'penaltyModal',
        'penaltyType',
        'penaltyDaysLate',
        'penaltyCompensation',
        'penaltyCurrentStrikesValue',
        'penaltyProjectedStrikesValue',
        'penaltySeverityValue',
        'penaltyCompensationStatusValue',
        'penaltyBanEffectValue'
    ];
    ids.forEach(id => expect(hasId(id), `Missing HTML id: ${id}`));

    const keys = [
        'penaltyCurrentStrikes',
        'penaltyProjectedStrikes',
        'penaltySeverity',
        'penaltyCompensationStatus',
        'penaltyBanEffect'
    ];
    keys.forEach(key => expect(hasDataI18n(key), `Missing penalty translation binding: ${key}`));

    expect(hasFunction(uiJs, 'openPenaltyModal'), 'Missing window.openPenaltyModal in js/ui.js');
    expect(hasFunction(uiJs, 'onPenaltyTypeChange'), 'Missing window.onPenaltyTypeChange in js/ui.js');
    expect(hasFunction(uiJs, 'onDaysLateChange'), 'Missing window.onDaysLateChange in js/ui.js');
    expect(hasIdentifier(uiJs, 'updatePenaltyImpactPreview'), 'Missing updatePenaltyImpactPreview helper in js/ui.js');
    expect(hasIdentifier(uiJs, 'bindPenaltyModalEvents'), 'Missing bindPenaltyModalEvents helper in js/ui.js');
});

recordGroup('history, penalty, and equipment UX contracts', () => {
    // History table: type column header + clear button
    expect(hasId('historyClearBtn'), 'Missing HTML id: historyClearBtn');
    expect(hasId('penaltyHistorySearchInput'), 'Missing HTML id: penaltyHistorySearchInput');
    expect(hasDataI18n('historyTypeColumn'), 'Missing history type column header data-i18n binding');
    expect(hasDataI18n('historyClearFilters'), 'Missing historyClearFilters data-i18n binding');
    expect(hasDataI18n('penaltyHistoryTitle'), 'Missing penaltyHistoryTitle data-i18n binding');

    // Pagination flex/hidden fix: must use style="display:none" not class="hidden"
    expect(
        /id=["']historyPagination["'][^>]*style=["'][^"']*display\s*:\s*none/.test(html),
        'historyPagination must use style="display:none" to avoid flex/hidden conflict'
    );

    // JS functions
    expect(hasFunction(uiJs, 'clearHistoryFilters'), 'Missing window.clearHistoryFilters in js/ui.js');
    expect(hasFunction(uiJs, 'applyHistoryFilters'), 'Missing window.applyHistoryFilters in js/ui.js');
    expect(hasFunction(uiJs, 'filterPenaltyHistoryList'), 'Missing window.filterPenaltyHistoryList in js/ui.js');
    expect(hasFunction(uiJs, 'showSkeletonLoading'), 'Missing window.showSkeletonLoading in js/ui.js');
    expect(hasIdentifier(uiJs, '_buildHistoryStatusBadge'), 'Missing shared _buildHistoryStatusBadge helper in js/ui.js');
    expect(hasIdentifier(uiJs, '_renderPenaltyHistoryItems'), 'Missing _renderPenaltyHistoryItems helper in js/ui.js');

    // client-side filter uses _historyAllData as base (not re-fetching)
    expect(hasIdentifier(uiJs, '_historyAllData'), 'applyHistoryFilters must use _historyAllData as base dataset');

    // fetchEquipments skeleton call
    expect(hasIdentifier(dataJs, 'showSkeletonLoading'), 'fetchEquipments must call showSkeletonLoading for loading state');

    // Translation keys for new UX (both languages)
    const historyPenaltyKeys = [
        'historyClearFilters', 'historyTypeColumn', 'historyShowing', 'historyOf', 'historyRecords',
        'historyStatusActive', 'historyStatusReturned', 'historyStatusOverdue', 'historyStatusLate',
        'penaltyHistoryTitle', 'penaltyHistorySearch', 'penaltyHistoryEmpty',
        'penaltyHistoryLateReturn', 'penaltyHistoryNoShow', 'penaltyHistoryMinorDamage',
        'penaltyHistoryMajorDamage', 'penaltyHistorySevereDamage', 'penaltyHistoryLost',
        'penaltyHistoryCompPaid', 'penaltyHistoryCompPending', 'equipmentLoading'
    ];
    historyPenaltyKeys.forEach(key => {
        expect(translationKeyCount(key) >= 2, `Translation key must exist for both languages: ${key}`);
    });
});

recordGroup('dashboard interaction contracts', () => {
    const interactiveIds = [
        'dashFocusHint',
        'dashPriorityOverdue',
        'dashPriorityPending',
        'dashPriorityUtilization',
        'kpi-total',
        'kpi-available',
        'kpi-borrowed',
        'kpi-pending',
        'kpi-overdue',
        'kpi-ontime',
        'dashTrendActionHint',
        'dashCategoryActionHint',
        'dashStatusActionHint',
        'dashBorrowersActionHint',
        'dashPenaltyActionHint',
        'dashTrendChart',
        'dashCategoryChart',
        'dashStatusChart',
        'dashBorrowersChart',
        'dashPenaltyChart'
    ];
    interactiveIds.forEach(id => expect(hasId(id), `Missing dashboard HTML id: ${id}`));

    const clickableCards = [
        'dashPriorityOverdue',
        'dashPriorityPending',
        'dashPriorityUtilization',
        'kpi-total',
        'kpi-available',
        'kpi-borrowed',
        'kpi-pending',
        'kpi-overdue',
        'kpi-ontime'
    ];

    clickableCards.forEach(id => {
        expect(hasAttribute(id, 'tabindex', '0'), `Dashboard card is missing tabindex=0: ${id}`);
        expect(hasAttribute(id, 'role', 'button'), `Dashboard card is missing role=button: ${id}`);
        expect(hasHandler(id, 'onclick', 'handleDashboardAction'), `Dashboard card is not wired to handleDashboardAction(): ${id}`);
        expect(hasHandler(id, 'onkeydown', 'handleDashboardActionKey'), `Dashboard card is not wired to handleDashboardActionKey(): ${id}`);
    });

    const chartIds = ['dashTrendChart', 'dashCategoryChart', 'dashStatusChart', 'dashBorrowersChart', 'dashPenaltyChart'];
    chartIds.forEach(id => {
        expect(hasAttribute(id, 'tabindex', '0'), `Dashboard chart is missing tabindex=0: ${id}`);
        expect(hasAttribute(id, 'role', 'button'), `Dashboard chart is missing role=button: ${id}`);
        expect(hasHandler(id, 'onkeydown', 'handleDashboardChartKey'), `Dashboard chart is not wired to handleDashboardChartKey(): ${id}`);
    });

    const hintKeys = [
        'dashboardActionFocus',
        'dashboardActionTotal',
        'dashboardActionAvailable',
        'dashboardActionBorrowed',
        'dashboardActionPending',
        'dashboardActionOverdue',
        'dashboardActionOnTime',
        'dashboardActionTrend',
        'dashboardActionCategory',
        'dashboardActionStatus',
        'dashboardActionBorrowers',
        'dashboardActionPenalty'
    ];
    hintKeys.forEach(key => expect(hasDataI18n(key), `Missing dashboard translation binding: ${key}`));

    expect(hasFunction(dashboardJs, 'openDashboardBrowseView'), 'Missing window.openDashboardBrowseView in js/dashboard.js');
    expect(hasFunction(dashboardJs, 'handleDashboardAction'), 'Missing window.handleDashboardAction in js/dashboard.js');
    expect(hasFunction(dashboardJs, 'handleDashboardActionKey'), 'Missing window.handleDashboardActionKey in js/dashboard.js');
    expect(hasFunction(dashboardJs, 'handleDashboardChartAction'), 'Missing window.handleDashboardChartAction in js/dashboard.js');
    expect(hasFunction(dashboardJs, 'handleDashboardChartKey'), 'Missing window.handleDashboardChartKey in js/dashboard.js');
    expect(hasFunction(uiJs, 'setHistoryFilters'), 'Missing window.setHistoryFilters in js/ui.js');
    expect(hasFunction(uiJs, 'openHistoryPage'), 'Missing window.openHistoryPage in js/ui.js');
    expect(hasIdentifier(dashboardJs, 'getElementsAtEventForMode'), 'Dashboard charts are missing click drill-down wiring');
});

recordGroup('translation keys for new UX', () => {
    const keys = [
        'requestReady',
        'requestNeedsAttention',
        'requestRuleMaxItems',
        'requestRuleNoWeekend',
        'requestRuleNoCurrentBorrow',
        'requestRuleNoCategoryConflict',
        'requestRuleCategoryUnique',
        'rejectReasonTitle',
        'rejectReasonHint',
        'rejectReasonPlaceholder',
        'confirmReject',
        'returnBorrowerLabel',
        'returnEquipmentLabel',
        'returnDecisionTitle',
        'returnDecisionHelper',
        'returnBorrowedOn',
        'returnDueOn',
        'returnDurationLabel',
        'returnStatusLabel',
        'returnTimingLabel',
        'returnChecklistTitle',
        'returnReadyMessage',
        'returnReviewMessage',
        'returnChecklistOnTime',
        'returnChecklistOverdue',
        'returnChecklistInspect',
        'returnChecklistPenalty',
        'returnPenaltyHint',
        'returnPenaltyAction',
        'returnDueIn',
        'manageHelper',
        'manageModeCreate',
        'manageModeEdit',
        'manageNameLabel',
        'manageTypeLabel',
        'manageImageLabel',
        'managePreviewTitle',
        'manageImagePreviewEmpty',
        'manageQuantityLabel',
        'manageQuantityCreateHint',
        'manageQuantityEditHint',
        'manageSummaryTitle',
        'manageCurrentQuantity',
        'managePlannedQuantity',
        'manageAvailabilityLabel',
        'manageImpactLabel',
        'manageReadyCreate',
        'manageReadyUpdate',
        'manageNeedsAttention',
        'manageImpactNoChange',
        'manageImpactIncrease',
        'manageImpactDecrease',
        'manageImpactBlocked',
        'manageValidationName',
        'manageValidationImage',
        'manageValidationType',
        'manageValidationYear',
        'manageValidationQuantity',
        'manageValidationBorrowedFloor',
        'manageDeleteHint',
        'manageDeleteAction',
        'manageDeleteConfirm',
        'manageDeleteReady',
        'manageDeleteBlocked',
        'manageDeleteSuccess',
        'save',
        'penaltyProfileLoading',
        'penaltyCurrentStrikes',
        'penaltyProjectedStrikes',
        'penaltyBanEffect',
        'penaltyNoBan',
        'penaltyTemporaryBan',
        'penaltyPermanentBan',
        'penaltySeverity',
        'penaltyCompensationStatus',
        'penaltyCompensationPending',
        'penaltyCompensationNone',
        'dashboardActionFocus',
        'dashboardActionOverdue',
        'dashboardActionPending',
        'dashboardActionUtilization',
        'dashboardActionTotal',
        'dashboardActionAvailable',
        'dashboardActionBorrowed',
        'dashboardActionOnTime',
        'dashboardActionTrend',
        'dashboardActionCategory',
        'dashboardActionStatus',
        'dashboardActionBorrowers',
        'dashboardActionPenalty'
    ];

    keys.forEach(key => {
        expect(translationKeyCount(key) >= 2, `Translation key must exist for both languages: ${key}`);
    });
});

recordGroup('js/html contract references', () => {
    const requestIdsReferencedByJs = [
        'requestValidationMessage',
        'requestEligibilityRules',
        'requestInlineWarnings',
        'requestSubmitBtn',
        'requestSummaryDurationValue',
        'requestSummaryItemsValue',
        'requestSummaryCategoriesValue',
        'rejectReasonModal',
        'rejectReasonInput',
        'rejectReasonTarget',
        'returnBorrowerName',
        'returnItemName',
        'returnBorrowedOnValue',
        'returnDueOnValue',
        'returnDecisionMessage',
        'returnDurationValue',
        'returnStatusValue',
        'returnTimingValue',
        'returnDecisionChecklist',
        'returnTransactionId',
        'manageModeBadge',
        'manageValidationMessage',
        'manageName',
        'manageType',
        'manageImage',
        'manageImagePreview',
        'manageImagePreviewEmpty',
        'manageQuantity',
        'manageSummaryMessage',
        'manageCurrentQuantityValue',
        'managePlannedQuantityValue',
        'manageAvailabilityValue',
        'manageImpactValue',
        'manageDeleteSection',
        'manageDeleteState',
        'manageDeleteBtn',
        'manageSaveBtn',
        'manageOriginalName'
    ];

    requestIdsReferencedByJs.forEach(id => {
        expect(hasId(id), `JS references missing HTML id: ${id}`);
    });

    const penaltyIdsReferencedByJs = [
        'penaltyType',
        'penaltyDaysLate',
        'penaltyCompensation',
        'penaltyCurrentStrikesValue',
        'penaltyProjectedStrikesValue',
        'penaltySeverityValue',
        'penaltyCompensationStatusValue',
        'penaltyBanEffectValue'
    ];

    penaltyIdsReferencedByJs.forEach(id => {
        expect(hasId(id), `Penalty JS references missing HTML id: ${id}`);
    });

    const dashboardIdsReferencedByJs = [
        'dashFocusTitle',
        'dashFocusSummary',
        'dashFocusHighlights',
        'dashPriorityOverdue',
        'dashPriorityPending',
        'dashPriorityUtilization',
        'dashTrendInsight',
        'dashCategoryInsight',
        'dashCategoryBreakdown',
        'dashStatusInsight',
        'dashBorrowersInsight',
        'dashPenaltyInsight',
        'dashTrendChart',
        'dashCategoryChart',
        'dashStatusChart',
        'dashBorrowersChart',
        'dashPenaltyChart'
    ];

    dashboardIdsReferencedByJs.forEach(id => {
        expect(hasId(id), `Dashboard JS references missing HTML id: ${id}`);
    });
});

if (failures.length > 0) {
    console.error('Smoke test failed:');
    failures.forEach((failure, index) => {
        console.error(`${index + 1}. ${failure}`);
    });
    process.exit(1);
}

console.log(`Smoke checks passed (${passGroups.length} groups)`);
passGroups.forEach(group => console.log(`- ${group}`));
