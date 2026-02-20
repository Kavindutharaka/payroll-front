import { Button, Label, TextInput, Textarea } from "flowbite-react";
import { HiX, HiTag, HiDocumentText } from "react-icons/hi";

export default function PositionForm({ closeForm }) {
  return (
    /* ── Backdrop ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">

      {/* ── Modal Card ── */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-purple-600 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Add Position</h3>
            <p className="text-sm text-purple-200">Fill in the details to create a new position</p>
          </div>
          <button
            type="button"
            onClick={closeForm}
            className="rounded-lg p-1.5 text-purple-200 transition-colors hover:bg-purple-500 hover:text-white"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form className="flex flex-col gap-5 px-6 py-6">

          {/* Level Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position1" value="Position" />
            <TextInput
              id="position1"
              type="text"
              icon={HiTag}
              placeholder="e.g. Software Engineer, Product Manager…"
              required
            />
            <p className="text-xs text-gray-400">Enter a short, unique name for this position.</p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="des1" value="Description" />
            <Textarea
              id="des1"
              placeholder="Briefly describe this position's responsibilities…"
              rows={3}
              required
            />
            <p className="text-xs text-gray-400">Optional — helps employees understand the position.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Button color="gray" type="button" onClick={closeForm}>
              Cancel
            </Button>
            <Button color="purple" type="submit">
              Save Position
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
