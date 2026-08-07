import { useState } from "react";
import type { ServerId } from "../../domain/id.js";
import type { Server } from "../../domain/server.js";
import type {
  NewServerInput,
  ServerEdits,
} from "../../planner/character-management.js";

export interface ServerListProps {
  readonly servers: readonly Server[];
  readonly onAddServer: (input: NewServerInput) => void;
  readonly onUpdateServer: (serverId: ServerId, changes: ServerEdits) => void;
}

function readServerForm(form: HTMLFormElement): NewServerInput {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    timezone: String(data.get("timezone") ?? ""),
    dailyResetTime: String(data.get("dailyResetTime") ?? ""),
  };
}

export function ServerList({
  servers,
  onAddServer,
  onUpdateServer,
}: ServerListProps) {
  const [editingServerId, setEditingServerId] = useState<ServerId | null>(null);

  return (
    <section aria-labelledby="servers-heading" className="space-y-3">
      <h2
        id="servers-heading"
        className="text-lg font-semibold text-neutral-100"
      >
        Servers
      </h2>

      <ul className="space-y-2">
        {servers.map((server) => (
          <li
            key={server.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3"
          >
            {editingServerId === server.id ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onUpdateServer(
                    server.id,
                    readServerForm(event.currentTarget),
                  );
                  setEditingServerId(null);
                }}
              >
                <label className="flex flex-col text-xs text-neutral-400">
                  Name
                  <input
                    name="name"
                    defaultValue={server.name}
                    required
                    className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                  />
                </label>
                <label className="flex flex-col text-xs text-neutral-400">
                  Timezone
                  <input
                    name="timezone"
                    defaultValue={server.timezone}
                    required
                    className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                  />
                </label>
                <label className="flex flex-col text-xs text-neutral-400">
                  Daily reset (HH:MM)
                  <input
                    name="dailyResetTime"
                    defaultValue={server.dailyResetTime}
                    required
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    className="mt-1 w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-neutral-950"
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-100"
                  onClick={() => setEditingServerId(null)}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-100">
                    {server.name}{" "}
                    {!server.active && (
                      <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                        inactive
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-neutral-400">
                    {server.timezone} · daily reset {server.dailyResetTime}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                    onClick={() => setEditingServerId(server.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
                    onClick={() =>
                      onUpdateServer(server.id, { active: !server.active })
                    }
                  >
                    {server.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
        {servers.length === 0 && (
          <p className="text-sm text-neutral-500">No servers yet.</p>
        )}
      </ul>

      <details className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-200">
          Add a server
        </summary>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAddServer(readServerForm(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <label className="flex flex-col text-xs text-neutral-400">
            Name
            <input
              name="name"
              required
              placeholder="Sanctuary 1"
              className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
            />
          </label>
          <label className="flex flex-col text-xs text-neutral-400">
            Timezone
            <input
              name="timezone"
              required
              defaultValue="Asia/Bangkok"
              className="mt-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
            />
          </label>
          <label className="flex flex-col text-xs text-neutral-400">
            Daily reset (HH:MM)
            <input
              name="dailyResetTime"
              required
              defaultValue="03:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              className="mt-1 w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-neutral-950"
          >
            Add server
          </button>
        </form>
      </details>
    </section>
  );
}
