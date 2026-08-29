"use client";
import React, { useRef } from "react";
import { X } from "lucide-react";
import AddExeForm from "./AddExeForm";
import { useRouter } from "next/navigation";
const AddExercise = ({ exerc, setShowPopup, onScheduleChange }) => {
  const boxRef = useRef();
  const router = useRouter();
  const handleClick = () => {
    setShowPopup(false);
    router.push("/#exercises");
  };
  const handleBoxClick = (e) => {
    if (boxRef.current == e.target) {
      setShowPopup(false);
      router.push("/#exercises");
    }
  };
  return (
    <div
      ref={boxRef}
      onClick={handleBoxClick}
      className="fixed inset-0 bg-white bg-opacity-30 backdrop-blur-sm flex justify-center items-center"
    >
      <div className="mt-10 flex flex-col gap-4">
        <button className="place-self-end" onClick={handleClick}>
          <X size={30} />
        </button>
        <AddExeForm
          exercise={exerc}
          setShowPopup={setShowPopup}
          onScheduleChange={onScheduleChange}
        />
      </div>
    </div>
  );
};

export default AddExercise;
