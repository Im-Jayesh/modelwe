import Image from "next/image";
import { getOptimizedUrl } from "@/lib/optimizeImage";

export default function GridGallery({
  images,
  isEditing = false,
  textColor,
}) {
  return (
    <section className="w-full max-w-[1400px] mx-auto px-6 py-24">
      <div
        className="
          grid
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          gap-6
        "
      >
        {/* UPLOAD TILE */}
        {isEditing && (
          <button
            type="button"
            className="
              aspect-[2/3]
              border-2 border-dashed
              flex flex-col
              items-center
              justify-center
              gap-2
              transition
            "
            style={{
              borderColor: textColor,
              color: textColor,
              opacity: 0.6,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
            onClick={() => {
              /* hook upload logic here */
            }}
          >
            <span className="text-2xl leading-none">＋</span>
            <span className="text-xs uppercase tracking-widest">
              Add Image
            </span>
          </button>
        )}

        {/* IMAGES */}
        {images.map((img, index) => (
          <div
            key={index}
            className="relative group aspect-[2/3] overflow-hidden"
          >
            <Image
              src={getOptimizedUrl(img.url, 800)}
              alt={`Portfolio shot ${index + 1}`}
              fill
              className="
                object-cover
                transition-all
                duration-700
                grayscale-[20%]
                group-hover:grayscale-0
                opacity-90
                group-hover:opacity-100
              "
            />

            {/* subtle hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500 pointer-events-none" />

            {/* caption */}
            {img.caption && (
              <div className="absolute bottom-4 left-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                <span className="text-[10px] tracking-[0.2em] text-white uppercase bg-black/50 px-2 py-1 backdrop-blur-md">
                  {img.caption}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}