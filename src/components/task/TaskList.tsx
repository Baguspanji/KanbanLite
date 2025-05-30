
"use client";

import { useAppContext } from "@/context/AppContext";
import type { Task } from "@/types"; 
import { TaskListItem } from "./TaskListItem";
import { TaskListSkeleton } from "./TaskListSkeleton";
import { DragDropContext, Droppable, type OnDragEndResponder } from '@hello-pangea/dnd';
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

interface TaskListComponentProps {
  projectId: string;
}

export function TaskListComponent({ projectId }: TaskListComponentProps) {
  const { getTasksByProjectId, isLoading, reorderTasksInList } = useAppContext();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const tasks = getTasksByProjectId(projectId);

  const onDragEnd: OnDragEndResponder = (result) => {
    const { source, destination } = result;

    if (!destination) {
      return; 
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return; 
    }

    reorderTasksInList(projectId, source.index, destination.index);
  };

  if (!hasMounted || isLoading) {
    return <TaskListSkeleton />;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg shadow-sm bg-card mt-4">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Tasks Yet</h3>
        <p className="text-muted-foreground">This project doesn't have any tasks. Click "Add Task" to create one.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable
        droppableId={`project-${projectId}-tasks`}
        type="TASK_LIST_ITEM"
        isDropDisabled={false}
        isCombineEnabled={false} 
        ignoreContainerClipping={false}
      >
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`mt-2 p-2 transition-colors duration-200 ease-in-out ${snapshot.isDraggingOver ? 'bg-accent/10 rounded-md' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskListItem key={task.id} task={task} projectId={projectId} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
