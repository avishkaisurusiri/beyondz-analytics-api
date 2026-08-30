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

const eventsBody =
  document.getElementById(
    "eventsBody"
  );

const refreshBtn =
  document.getElementById(
    "refreshBtn"
  );

const exportBtn =
  document.getElementById(
    "exportBtn"
  );


async function checkHealth() {
  try {

    const response =
      await fetch("/health");

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


async function loadEvents() {

  eventsBody.innerHTML = `
    <tr>
      <td colspan="8">
        Loading...
      </td>
    </tr>
  `;

  try {

    const response =
      await fetch(
        "/api/events"
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        "Could not load events"
      );
    }


    const events =
      data.events || [];

    eventCount.textContent =
      events.length;


    if (!events.length) {

      eventsBody.innerHTML = `
        <tr>
          <td
            colspan="8"
            class="empty-state"
          >
            No analytics events found.
          </td>
        </tr>
      `;

      return;
    }


    eventsBody.innerHTML =
      events.map(
        (event) => {

          const entity =
            event.entity_type
              ? `${event.entity_type}: ${
                  event.entity_id || "-"
                }`
              : "-";

          const time =
            event.created_at
              ? new Date(
                  event.created_at
                ).toLocaleString()
              : "-";

          return `
            <tr>

              <td>
                ${escapeHtml(
                  event.event_id
                )}
              </td>

              <td>
                <strong>
                  ${escapeHtml(
                    event.event_name
                  )}
                </strong>
              </td>

              <td>
                ${escapeHtml(
                  event.user_id || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  event.user_role || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  event.tutor_id || "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  event.page || "-"
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

            </tr>
          `;
        }
      )
      .join("");

  } catch (error) {

    eventCount.textContent =
      "-";

    eventsBody.innerHTML = `
      <tr>

        <td
          colspan="8"
          class="empty-state"
        >
          Unable to load analytics events.
        </td>

      </tr>
    `;
  }
}


function escapeHtml(value) {

  return String(value ?? "")
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


refreshBtn.addEventListener(
  "click",
  async () => {

    await checkHealth();

    await loadEvents();
  }
);


exportBtn.addEventListener(
  "click",
  () => {

    window.location.href =
      "/api/export/events.xlsx";
  }
);


async function init() {

  await checkHealth();

  await loadEvents();
}


init();