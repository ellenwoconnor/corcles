<div className="grid gap-2 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="free-item"
              checked={isFreeItem}
              onCheckedChange={setIsFreeItem}
              {...register("isGift")}
            />
            <Label
              htmlFor="free-item"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Free Item
            </Label>
          </div>
        </div>