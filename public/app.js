/*
========================================================
DOM REFERENCES
========================================================
*/

const apiStatus =
  document.getElementById(
    "apiStatus"
  );

const dbStatus =
  document.getElementById(
    "dbStatus"
  );

const eventCount =
  document.getElementById(
    "eventCount"
  );

const currentCategory =
  document.getElementById(
    "currentCategory"
  );

const showingCount =
  document.getElementById(
    "showingCount"
  );

const totalMatching =
  document.getElementById(
    "totalMatching"
  );

const currentPage =
  document.getElementById(
    "currentPage"
  );

const pageSizeDisplay =
  document.getElementById(
    "pageSizeDisplay"
  );

const eventsBody =
  document.getElementById(
    "eventsBody"
  );

const eventsPanelTitle =
  document.getElementById(
    "eventsPanelTitle"
  );

const eventsPanelDescription =
  document.getElementById(
    "eventsPanelDescription"
  );


/*
========================================================
DATASET CONTROLS
========================================================
*/

const exportType =
  document.getElementById(
    "exportType"
  );

const viewSelectedBtn =
  document.getElementById(
    "viewSelectedBtn"
  );


const viewSyntheticBtn =
  document.getElementById(
    "viewSyntheticBtn"
  );


const exportBtn =
  document.getElementById(
    "exportBtn"
  );

const completeExportBtn =
  document.getElementById(
    "completeExportBtn"
  );


/*
========================================================
FILTER CONTROLS
========================================================
*/

const eventNameFilter =
  document.getElementById(
    "eventNameFilter"
  );

const userIdFilter =
  document.getElementById(
    "userIdFilter"
  );

const tutorIdFilter =
  document.getElementById(
    "tutorIdFilter"
  );

const entityTypeFilter =
  document.getElementById(
    "entityTypeFilter"
  );

const fromDateFilter =
  document.getElementById(
    "fromDateFilter"
  );

const toDateFilter =
  document.getElementById(
    "toDateFilter"
  );

const applyFiltersBtn =
  document.getElementById(
    "applyFiltersBtn"
  );

const clearFiltersBtn =
  document.getElementById(
    "clearFiltersBtn"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );


/*
========================================================
PAGINATION
========================================================
*/

const previousPageBtn =
  document.getElementById(
    "previousPageBtn"
  );

const nextPageBtn =
  document.getElementById(
    "nextPageBtn"
  );

const paginationInfo =
  document.getElementById(
    "paginationInfo"
  );


/*
========================================================
EVENT DETAILS MODAL
========================================================
*/

const eventDetailsModal =
  document.getElementById(
    "eventDetailsModal"
  );

const closeEventDetailsBtn =
  document.getElementById(
    "closeEventDetailsBtn"
  );

const detailEventName =
  document.getElementById(
    "detailEventName"
  );

const detailUser =
  document.getElementById(
    "detailUser"
  );

const detailEntity =
  document.getElementById(
    "detailEntity"
  );

const detailTime =
  document.getElementById(
    "detailTime"
  );

const detailMetadata =
  document.getElementById(
    "detailMetadata"
  );


/*
========================================================
CONFIGURATION
========================================================
*/

const PAGE_SIZE =
  50;


const EXPORT_ROUTES = {

  events:
    "/api/export/events.xlsx",

  "student-activity":
    "/api/export/student-activity.xlsx",

  "lessons-videos":
    "/api/export/lessons-videos.xlsx",

  "written-exams":
    "/api/export/written-exams.xlsx",

  quizzes:
    "/api/export/quizzes.xlsx",

  attendance:
    "/api/export/attendance.xlsx",

  "enrollment-payments":
    "/api/export/enrollment-payments.xlsx",

  "ai-usage":
    "/api/export/ai-usage.xlsx",

  "subject-chat":
    "/api/export/subject-chat.xlsx",

  "tutor-operations":
    "/api/export/tutor-operations.xlsx",

  "system-errors":
    "/api/export/system-errors.xlsx"

};


const CATEGORY_LABELS = {

  events:
    "All Events",

  "student-activity":
    "Student Activity",

  "lessons-videos":
    "Lessons & Videos",

  "written-exams":
    "Written Exams",

  quizzes:
    "Quiz Performance",

  attendance:
    "Attendance & QR",

  "enrollment-payments":
    "Enrollment & Payments",

  "ai-usage":
    "AI Usage",

  "subject-chat":
    "Subject Chat",

  "tutor-operations":
    "Tutor Operations",

  "system-errors":
    "System Errors"

};


/*
========================================================
STATE
========================================================
*/

const analyticsState = {

  category:
    "events",

  syntheticOnly:
    false,

  offset:
    0,

  limit:
    PAGE_SIZE,

  total:
    0,

  events:
    [],

  loading:
    false

};


/*
========================================================
HEALTH CHECK
========================================================
*/

async function checkHealth() {

  try {

    apiStatus.textContent =
      "Checking...";

    apiStatus.className =
      "status-loading";


    dbStatus.textContent =
      "Checking...";

    dbStatus.className =
      "status-loading";


    const response =
      await fetch(
        "/health"
      );


    if (!response.ok) {

      throw new Error(
        "Health request failed"
      );

    }


    const data =
      await response.json();


    apiStatus.textContent =
      "Online";

    apiStatus.className =
      "status-online";


    if (
      data.database ===
      "connected"
    ) {

      dbStatus.textContent =
        "Connected";

      dbStatus.className =
        "status-online";

    } else {

      dbStatus.textContent =
        "Disconnected";

      dbStatus.className =
        "status-offline";

    }


  } catch (error) {

    console.error(
      "Analytics health check failed:",
      error
    );


    apiStatus.textContent =
      "Offline";

    apiStatus.className =
      "status-offline";


    dbStatus.textContent =
      "Unknown";

    dbStatus.className =
      "status-offline";

  }

}


/*
========================================================
FILTER HELPERS
========================================================
*/

function getFilters() {

  return {

    event_name:
      eventNameFilter.value.trim(),

    user_id:
      userIdFilter.value.trim(),

    tutor_id:
      tutorIdFilter.value.trim(),

    entity_type:
      entityTypeFilter.value.trim(),

    from:
      fromDateFilter.value,

    to:
      toDateFilter.value

  };

}


function appendQueryValue(
  params,
  key,
  value
) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return;

  }


  params.set(
    key,
    value
  );

}


/*
========================================================
BUILD EVENTS URL
========================================================
*/

function buildEventsUrl() {

  const params =
    new URLSearchParams();


  if (
    analyticsState.category !==
    "events"
  ) {

    params.set(
      "category",
      analyticsState.category
    );

  }


  if (
    analyticsState.syntheticOnly
  ) {

    params.set(
      "synthetic",
      "true"
    );

  }


  const filters =
    getFilters();


  appendQueryValue(
    params,
    "event_name",
    filters.event_name
  );


  appendQueryValue(
    params,
    "user_id",
    filters.user_id
  );


  appendQueryValue(
    params,
    "tutor_id",
    filters.tutor_id
  );


  appendQueryValue(
    params,
    "entity_type",
    filters.entity_type
  );


  /*
   * Beginning of selected day.
   */

  if (
    filters.from
  ) {

    params.set(
      "from",
      `${filters.from}T00:00:00`
    );

  }


  /*
   * IMPORTANT:
   *
   * Backend uses:
   *
   * created_at < to
   *
   * Therefore the To date must become the
   * beginning of the following day.
   */

  if (
    filters.to
  ) {

    const nextDay =
      getNextDateString(
        filters.to
      );


    if (
      nextDay
    ) {

      params.set(
        "to",
        `${nextDay}T00:00:00`
      );

    }

  }


  params.set(
    "limit",
    String(
      analyticsState.limit
    )
  );


  params.set(
    "offset",
    String(
      analyticsState.offset
    )
  );


  return (
    `/api/events?${params.toString()}`
  );

}


/*
========================================================
DATE HELPER
========================================================
*/

function getNextDateString(
  dateString
) {

  if (
    !dateString
  ) {

    return "";

  }


  const parts =
    dateString.split("-");


  if (
    parts.length !== 3
  ) {

    return "";

  }


  const year =
    Number(
      parts[0]
    );

  const month =
    Number(
      parts[1]
    );

  const day =
    Number(
      parts[2]
    );


  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {

    return "";

  }


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day + 1
      )
    );


  const nextYear =
    date
      .getUTCFullYear();

  const nextMonth =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const nextDay =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${nextYear}-${nextMonth}-${nextDay}`
  );

}


/*
========================================================
LOAD EVENTS
========================================================
*/

async function loadEvents({
  resetOffset = false
} = {}) {

  if (
    analyticsState.loading
  ) {

    return;

  }


  if (
    resetOffset
  ) {

    analyticsState.offset =
      0;

  }


  analyticsState.loading =
    true;


  setTableLoading();


  try {

    const url =
      buildEventsUrl();


    const response =
      await fetch(
        url
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.message ||
        "Could not load analytics events"
      );

    }


    analyticsState.events =
      Array.isArray(
        data.events
      )
        ? data.events
        : [];


    analyticsState.total =
      Number(
        data.total ??
        analyticsState.events.length
      ) || 0;


    /*
     * If records were deleted or filters changed
     * while sitting on a later page, move back to
     * the last valid page.
     */

    if (
      analyticsState.total > 0 &&
      analyticsState.offset >=
        analyticsState.total
    ) {

      const lastPageIndex =
        Math.floor(
          (
            analyticsState.total -
            1
          ) /
          analyticsState.limit
        );


      analyticsState.offset =
        lastPageIndex *
        analyticsState.limit;


      analyticsState.loading =
        false;


      return loadEvents();

    }


    updateDatasetDisplay();

    renderEvents(
      analyticsState.events
    );

    updatePagination();


  } catch (error) {

    console.error(
      "Unable to load analytics events:",
      error
    );


    analyticsState.events =
      [];

    analyticsState.total =
      0;


    renderLoadError();

    updateDatasetDisplay();

    updatePagination();


  } finally {

    analyticsState.loading =
      false;

  }

}


/*
========================================================
TABLE LOADING STATE
========================================================
*/

function setTableLoading() {

  eventsBody.innerHTML = `
    <tr class="loading-row">

      <td colspan="9">
        Loading analytics data...
      </td>

    </tr>
  `;

}


/*
========================================================
RENDER EVENTS
========================================================
*/

function renderEvents(
  events
) {

  if (
    !events.length
  ) {

    eventsBody.innerHTML = `
      <tr>

        <td
          colspan="9"
          class="empty-state"
        >
          No analytics events found
          for the current dataset and filters.
        </td>

      </tr>
    `;


    return;

  }


  eventsBody.innerHTML =
    events
      .map(
        (
          event,
          index
        ) => {

          const entity =
            buildEntityLabel(
              event
            );


          const time =
            formatDateTime(
              event.created_at
            );


          return `
            <tr>

              <td>
                ${escapeHtml(
                  event.event_id ??
                  "-"
                )}
              </td>


              <td>
                <strong>
                  ${escapeHtml(
                    event.event_name ||
                    "-"
                  )}
                </strong>
              </td>


              <td>
                ${escapeHtml(
                  event.user_id ||
                  "-"
                )}
              </td>


              <td>
                ${escapeHtml(
                  event.user_role ||
                  "-"
                )}
              </td>


              <td>
                ${escapeHtml(
                  event.tutor_id ||
                  "-"
                )}
              </td>


              <td>
                ${escapeHtml(
                  event.page ||
                  "-"
                )}
              </td>


              <td>
                ${escapeHtml(
                  entity
                )}
              </td>


              <td>
                ${escapeHtml(
                  time
                )}
              </td>


              <td>

                <button
                  type="button"
                  class="details-button"
                  data-event-index="${index}"
                >
                  Details
                </button>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


/*
========================================================
LOAD ERROR
========================================================
*/

function renderLoadError() {

  eventsBody.innerHTML = `
    <tr>

      <td
        colspan="9"
        class="empty-state error-text"
      >
        Unable to load analytics events.
        Check the Analytics API and database connection.
      </td>

    </tr>
  `;

}


/*
========================================================
ENTITY LABEL
========================================================
*/

function buildEntityLabel(
  event
) {

  const type =
    event.entity_type;

  const id =
    event.entity_id;


  if (
    type &&
    id
  ) {

    return (
      `${type}: ${id}`
    );

  }


  if (
    type
  ) {

    return type;

  }


  if (
    id
  ) {

    return id;

  }


  return "-";

}


/*
========================================================
DATE FORMATTING
========================================================
*/

function formatDateTime(
  value
) {

  if (
    !value
  ) {

    return "-";

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(
      value
    );

  }


  return date
    .toLocaleString();

}


/*
========================================================
UPDATE DASHBOARD DISPLAY
========================================================
*/

function updateDatasetDisplay() {

  const label =
    CATEGORY_LABELS[
      analyticsState.category
    ] ||
    "Analytics Events";


  const displayLabel =
    analyticsState.syntheticOnly
      ? `Synthetic · ${label}`
      : label;


  const showing =
    analyticsState.events.length;


  const pageNumber =
    Math.floor(
      analyticsState.offset /
      analyticsState.limit
    ) + 1;


  eventCount.textContent =
    formatNumber(
      analyticsState.total
    );


  currentCategory.textContent =
    displayLabel;


  showingCount.textContent =
    formatNumber(
      showing
    );


  totalMatching.textContent =
    formatNumber(
      analyticsState.total
    );


  currentPage.textContent =
    String(
      pageNumber
    );


  pageSizeDisplay.textContent =
    String(
      analyticsState.limit
    );


  eventsPanelTitle.textContent =
    analyticsState.syntheticOnly
      ? `Generated Synthetic Data · ${label}`
      : label;


  eventsPanelDescription.textContent =
    buildDatasetDescription(
      label
    );

}


/*
========================================================
DATASET DESCRIPTION
========================================================
*/

function buildDatasetDescription(
  label
) {

  const filters =
    getFilters();


  const sourceText =
    analyticsState.syntheticOnly
      ? "Generated synthetic analytics data"
      : "Analytics data";


  const activeFilters =
    Object.values(
      filters
    ).filter(
      Boolean
    ).length;


  if (
    activeFilters > 0
  ) {

    return (
      `${sourceText} for ${label.toLowerCase()} filtered using ` +
      `${activeFilters} active filter${
        activeFilters === 1
          ? ""
          : "s"
      }.`
    );

  }


  if (
    analyticsState.syntheticOnly
  ) {

    return (
      `Generated synthetic ${label.toLowerCase()} ` +
      `from the BeyondZ behavioural simulation dataset.`
    );

  }


  return (
    `Latest ${label.toLowerCase()} ` +
    `received from BeyondZ Academy.`
  );

}

/*
========================================================
NUMBER FORMAT
========================================================
*/

function formatNumber(
  value
) {

  const number =
    Number(
      value
    );


  if (
    !Number.isFinite(
      number
    )
  ) {

    return "0";

  }


  return number
    .toLocaleString();

}


/*
========================================================
PAGINATION
========================================================
*/

function updatePagination() {

  const total =
    analyticsState.total;

  const limit =
    analyticsState.limit;

  const offset =
    analyticsState.offset;


  const page =
    Math.floor(
      offset /
      limit
    ) + 1;


  const totalPages =
    total > 0
      ? Math.ceil(
          total /
          limit
        )
      : 1;


  paginationInfo.textContent =
    `Page ${page} of ${totalPages}`;


  previousPageBtn.disabled =
    offset <= 0 ||
    analyticsState.loading;


  nextPageBtn.disabled =
    offset + limit >=
      total ||
    analyticsState.loading;

}


/*
========================================================
PREVIOUS PAGE
========================================================
*/

async function previousPage() {

  if (
    analyticsState.offset <= 0
  ) {

    return;

  }


  analyticsState.offset =
    Math.max(
      0,
      analyticsState.offset -
      analyticsState.limit
    );


  await loadEvents();

}


/*
========================================================
NEXT PAGE
========================================================
*/

async function nextPage() {

  if (
    analyticsState.offset +
      analyticsState.limit >=
    analyticsState.total
  ) {

    return;

  }


  analyticsState.offset +=
    analyticsState.limit;


  await loadEvents();

}


/*
========================================================
CLEAR FILTERS
========================================================
*/

function clearFilters() {

  eventNameFilter.value =
    "";

  userIdFilter.value =
    "";

  tutorIdFilter.value =
    "";

  entityTypeFilter.value =
    "";

  fromDateFilter.value =
    "";

  toDateFilter.value =
    "";

}


/*
========================================================
VALIDATE FILTERS
========================================================
*/

function validateFilters() {

  const from =
    fromDateFilter.value;

  const to =
    toDateFilter.value;


  if (
    from &&
    to &&
    from > to
  ) {

    alert(
      "The From date cannot be after the To date."
    );


    return false;

  }


  return true;

}


/*
========================================================
EXPORT SELECTED DATASET
========================================================
*/

function exportSelectedCategory() {

  if (
    !validateFilters()
  ) {

    return;

  }


  const selected =
    exportType.value;


  const route =
    EXPORT_ROUTES[
      selected
    ];


  if (
    !route
  ) {

    alert(
      "Please select a valid export dataset."
    );


    return;

  }


  const params =
    new URLSearchParams();


  /*
   * -------------------------------------------------------
   * DATASET MODE
   * -------------------------------------------------------
   */

  params.set(
    "dataset",
    analyticsState.syntheticOnly
      ? "synthetic"
      : "real"
  );


  if (
    analyticsState.syntheticOnly
  ) {

    params.set(
      "synthetic",
      "true"
    );

  }


  /*
   * -------------------------------------------------------
   * ACTIVE FILTERS
   * -------------------------------------------------------
   */

  const filters =
    getFilters();


  appendQueryValue(
    params,
    "event_name",
    filters.event_name
  );


  appendQueryValue(
    params,
    "user_id",
    filters.user_id
  );


  appendQueryValue(
    params,
    "tutor_id",
    filters.tutor_id
  );


  appendQueryValue(
    params,
    "entity_type",
    filters.entity_type
  );


  /*
   * Keep the original selected dates in
   * the query for filename generation.
   */

  if (
    filters.from
  ) {

    params.set(
      "from",
      `${filters.from}T00:00:00`
    );


    params.set(
      "filename_from",
      filters.from
    );

  }


  if (
    filters.to
  ) {

    const nextDay =
      getNextDateString(
        filters.to
      );


    if (
      nextDay
    ) {

      params.set(
        "to",
        `${nextDay}T00:00:00`
      );

    }


    params.set(
      "filename_to",
      filters.to
    );

  }


  const query =
    params.toString();


  window.location.href =
    query
      ? `${route}?${query}`
      : route;

}

/*
========================================================
EXPORT COMPLETE WORKBOOK
========================================================
*/

function exportCompleteWorkbook() {

  window.location.href =
    "/api/export/complete.xlsx";

}


/*
========================================================
EVENT DETAILS
========================================================
*/

function openEventDetails(
  event
) {

  if (
    !event
  ) {

    return;

  }


  detailEventName.textContent =
    event.event_name ||
    "-";


  detailUser.textContent =
    event.user_id ||
    "-";


  detailEntity.textContent =
    buildEntityLabel(
      event
    );


  detailTime.textContent =
    formatDateTime(
      event.created_at
    );


  detailMetadata.textContent =
    formatMetadata(
      event.metadata
    );


  eventDetailsModal.classList.add(
    "show"
  );


  eventDetailsModal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";

}


/*
========================================================
CLOSE DETAILS
========================================================
*/

function closeEventDetails() {

  eventDetailsModal.classList.remove(
    "show"
  );


  eventDetailsModal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";

}


/*
========================================================
FORMAT METADATA
========================================================
*/

function formatMetadata(
  metadata
) {

  if (
    metadata === undefined ||
    metadata === null
  ) {

    return "{}";

  }


  if (
    typeof metadata ===
    "string"
  ) {

    try {

      const parsed =
        JSON.parse(
          metadata
        );


      return JSON.stringify(
        parsed,
        null,
        2
      );


    } catch (error) {

      return metadata;

    }

  }


  try {

    return JSON.stringify(
      metadata,
      null,
      2
    );


  } catch (error) {

    return String(
      metadata
    );

  }

}


/*
========================================================
HTML ESCAPING
========================================================
*/

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/*
========================================================
EVENT TABLE CLICK HANDLER
========================================================
*/

eventsBody.addEventListener(
  "click",
  (
    event
  ) => {

    const button =
      event.target.closest(
        ".details-button"
      );


    if (
      !button
    ) {

      return;

    }


    const index =
      Number(
        button.dataset.eventIndex
      );


    if (
      !Number.isInteger(
        index
      )
    ) {

      return;

    }


    const analyticsEvent =
      analyticsState.events[
        index
      ];


    openEventDetails(
      analyticsEvent
    );

  }
);


/*
========================================================
DATASET SELECTION
========================================================
*/
viewSelectedBtn.addEventListener(
  "click",
  async () => {

    analyticsState.category =
      exportType.value;


    analyticsState.syntheticOnly =
      false;


    analyticsState.offset =
      0;


    await loadEvents();

  }
);

viewSyntheticBtn.addEventListener(
  "click",
  async () => {

    analyticsState.category =
      exportType.value;


    analyticsState.syntheticOnly =
      true;


    analyticsState.offset =
      0;


    await loadEvents();

  }
);


/*
========================================================
APPLY FILTERS
========================================================
*/

applyFiltersBtn.addEventListener(
  "click",
  async () => {

    if (
      !validateFilters()
    ) {

      return;

    }


    analyticsState.category =
      exportType.value;


    analyticsState.offset =
      0;


    await loadEvents();

  }
);


/*
========================================================
CLEAR FILTERS
========================================================
*/

clearFiltersBtn.addEventListener(
  "click",
  async () => {

    clearFilters();


    analyticsState.offset =
      0;


    await loadEvents();

  }
);


/*
========================================================
REFRESH
========================================================
*/

refreshBtn.addEventListener(
  "click",
  async () => {

    if (
      !validateFilters()
    ) {

      return;

    }


    await checkHealth();

    await loadEvents();

  }
);


/*
========================================================
EXPORT BUTTONS
========================================================
*/

exportBtn.addEventListener(
  "click",
  exportSelectedCategory
);


completeExportBtn.addEventListener(
  "click",
  exportCompleteWorkbook
);


/*
========================================================
PAGINATION BUTTONS
========================================================
*/

previousPageBtn.addEventListener(
  "click",
  previousPage
);


nextPageBtn.addEventListener(
  "click",
  nextPage
);


/*
========================================================
MODAL CLOSE BUTTON
========================================================
*/

closeEventDetailsBtn.addEventListener(
  "click",
  closeEventDetails
);


/*
========================================================
MODAL BACKDROP
========================================================
*/

eventDetailsModal.addEventListener(
  "click",
  (
    event
  ) => {

    if (
      event.target.classList.contains(
        "modal-backdrop"
      )
    ) {

      closeEventDetails();

    }

  }
);


/*
========================================================
ESCAPE KEY
========================================================
*/

document.addEventListener(
  "keydown",
  (
    event
  ) => {

    if (
      event.key ===
        "Escape" &&
      eventDetailsModal.classList.contains(
        "show"
      )
    ) {

      closeEventDetails();

    }

  }
);


/*
========================================================
ENTER KEY FILTERING
========================================================
*/

[
  eventNameFilter,
  userIdFilter,
  tutorIdFilter,
  entityTypeFilter

].forEach(
  (
    input
  ) => {

    input.addEventListener(
      "keydown",
      async (
        event
      ) => {

        if (
          event.key !==
          "Enter"
        ) {

          return;

        }


        if (
          !validateFilters()
        ) {

          return;

        }


        analyticsState.offset =
          0;


        await loadEvents();

      }
    );

  }
);


/*
========================================================
INITIALIZE
========================================================
*/

async function init() {

  pageSizeDisplay.textContent =
    String(
      PAGE_SIZE
    );


  await checkHealth();


  await loadEvents({
    resetOffset: true
  });

}


init();